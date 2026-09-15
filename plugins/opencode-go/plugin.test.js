import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCtx } from "../test-helpers.js";
import pluginManifest from "./plugin.json";
import FIXTURE from "./usage.fixture.json";

const AUTH_PATH = "~/.local/share/opencode/auth.json";
const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";

const loadPlugin = async () => {
  await import("./plugin.js");
  return globalThis.__quotracker_plugin;
};

function setAuth(ctx, value = "go-key") {
  ctx.host.fs.writeText(
    AUTH_PATH,
    JSON.stringify({ "opencode-go": { type: "api-key", key: value } }),
  );
}

function setResponse(ctx, body = FIXTURE, status = 200) {
  ctx.host.http.request.mockReturnValue({
    status,
    bodyText: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function usageWithPercent(percent) {
  return {
    usage: {
      rolling: { status: "ok", percent, resetsAt: "2026-09-05T05:00:00.000Z" },
      weekly: { status: "ok", percent, resetsAt: "2026-09-07T00:00:00.000Z" },
      monthly: { status: "ok", percent, resetsAt: "2026-10-01T00:00:00.000Z" },
    },
  };
}

function cloneFixture() {
  return JSON.parse(JSON.stringify(FIXTURE));
}

async function probeAt(nowIso) {
  const ctx = makeCtx();
  ctx.nowIso = nowIso;
  setAuth(ctx);
  setResponse(ctx);
  return (await loadPlugin()).probe(ctx);
}

describe("opencode-go plugin", () => {
  beforeEach(() => {
    delete globalThis.__quotracker_plugin;
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("omits Window Starter", () => {
    expect(pluginManifest.windowStarter).toBeUndefined();
  });

  it("ships plugin metadata with links and expected line layout", async () => {
    expect(pluginManifest.id).toBe("opencode-go");
    expect(pluginManifest.name).toBe("OpenCode Go");
    expect(pluginManifest.brandColor).toBe("#000000");
    expect(pluginManifest.links).toEqual([
      { label: "Dashboard", url: "https://opencode.ai/auth" },
    ]);
    expect(pluginManifest.lines).toEqual([
      { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
      { type: "progress", label: "Weekly", scope: "overview", visibleByDefault: true },
      { type: "progress", label: "Monthly", scope: "detail", visibleByDefault: true },
      { type: "text", label: "Today", scope: "detail" },
      { type: "text", label: "Yesterday", scope: "detail" },
      { type: "text", label: "Last 30 Days", scope: "detail" },
    ]);
    await loadPlugin();
  });

  it("uses the authoritative rolling, weekly, and monthly API windows", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx);

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);

    expect(ctx.host.http.request).toHaveBeenCalledTimes(1);
    expect(ctx.host.http.request).toHaveBeenCalledWith({
      method: "GET",
      url: USAGE_URL,
      headers: { Authorization: "Bearer go-key", Accept: "application/json" },
      timeoutMs: 10000,
    });
    expect(result).toEqual({
      plan: "Go",
      lines: [
        {
          type: "progress",
          label: "Session",
          used: 3,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: "2026-09-05T05:00:00.000Z",
          periodDurationMs: 5 * 60 * 60 * 1000,
        },
        {
          type: "progress",
          label: "Weekly",
          used: 1,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: "2026-09-07T00:00:00.000Z",
          periodDurationMs: 7 * 24 * 60 * 60 * 1000,
        },
        {
          type: "progress",
          label: "Monthly",
          used: 0,
          limit: 100,
          format: { kind: "percent" },
          resetsAt: "2026-10-01T00:00:00.000Z",
          periodDurationMs: 30 * 24 * 60 * 60 * 1000,
        },
      ],
      statuses: [{ text: "DeepSeek Off-Peak", tone: "positive" }],
    });
    expect(ctx.host.sqlite.query).not.toHaveBeenCalled();
  });

  it("derives a calendar-aware monthly duration for pace status metadata", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    const body = cloneFixture();
    body.usage.monthly.resetsAt = "2026-03-31T00:00:00.000Z";
    setResponse(ctx, body);

    const result = (await loadPlugin()).probe(ctx);
    expect(result.lines[2].periodDurationMs).toBe(31 * 24 * 60 * 60 * 1000);
  });

  it("accepts the API's rate-limited status as a valid window", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    const body = cloneFixture();
    body.usage.weekly.status = "rate-limited";
    body.usage.weekly.percent = 100;
    setResponse(ctx, body);

    const result = (await loadPlugin()).probe(ctx);
    expect(result.lines[1].used).toBe(100);
  });

  it.each([
    [0, 100],
    [1, 99],
    [50, 50],
    [99, 1],
    [100, 0],
  ])("maps percent=%s to remaining=%s without fraction conversion", async (percent, remaining) => {
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx, usageWithPercent(percent));

    const result = (await loadPlugin()).probe(ctx);
    expect(result.lines.map((line) => line.used)).toEqual([percent, percent, percent]);
    expect(result.lines.map((line) => line.limit - line.used)).toEqual([
      remaining,
      remaining,
      remaining,
    ]);
  });

  it("keeps a fractional API value as a percentage and clamps bounds", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx, usageWithPercent(0.5));
    expect((await loadPlugin()).probe(ctx).lines[0].used).toBe(0.5);

    setResponse(ctx, usageWithPercent(-20));
    expect((await loadPlugin()).probe(ctx).lines[0].used).toBe(0);

    setResponse(ctx, usageWithPercent(120));
    expect((await loadPlugin()).probe(ctx).lines[0].used).toBe(100);
  });

  it("does not use SQLite, config, or a dollar-cost fallback", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    ctx.host.fs.writeText(
      ctx.app.pluginDataDir + "/config.json",
      JSON.stringify({ usageCorrection: { monthlyPercent: 99 } }),
    );
    setResponse(ctx, usageWithPercent(1));

    const result = (await loadPlugin()).probe(ctx);
    expect(result.lines[0].used).toBe(1);
    expect(ctx.host.sqlite.query).not.toHaveBeenCalled();
  });

  it("throws when auth is missing or malformed", async () => {
    const ctx = makeCtx();
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Authentication unavailable");
    expect(ctx.host.http.request).not.toHaveBeenCalled();

    ctx.host.fs.writeText(AUTH_PATH, "{bad json");
    expect(() => plugin.probe(ctx)).toThrow("Authentication unavailable");
    expect(ctx.host.http.request).not.toHaveBeenCalled();
  });

  it("throws when auth cannot be read", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    ctx.host.fs.readText = () => {
      throw new Error("permission denied");
    };

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Authentication unavailable");
    expect(ctx.host.http.request).not.toHaveBeenCalled();
  });

  it("throws on HTTP 401", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx, {}, 401);

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Authentication failed");
  });

  it("throws Access denied for a generic HTTP 403", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx, { error: { type: "Forbidden" } }, 403);

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Access denied");
  });

  it("throws when 403 EntitlementError has no local spend", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx, { error: { type: "EntitlementError" } }, 403);

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("No Go subscription");
  });

  it.each([0, 400, 500])("throws for non-success HTTP %s", async (status) => {
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx, {}, status);

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Usage unavailable");
  });

  it("throws for network errors without logging the key", async () => {
    const ctx = makeCtx();
    setAuth(ctx, "secret-key");
    ctx.host.http.request.mockImplementation(() => {
      throw new Error("network failed for secret-key");
    });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Usage unavailable");
    for (const logger of Object.values(ctx.host.log)) {
      expect(logger.mock.calls).toEqual([]);
    }
  });

  it.each(["rolling", "weekly", "monthly"])(
    "rejects a response missing the %s window",
    async (window) => {
      const ctx = makeCtx();
      setAuth(ctx);
      const body = cloneFixture();
      delete body.usage[window];
      setResponse(ctx, body);

      const plugin = await loadPlugin();
      expect(() => plugin.probe(ctx)).toThrow("Usage unavailable");
    },
  );

  it.each(["rolling", "weekly", "monthly"])(
    "rejects an invalid status in the %s window",
    async (window) => {
      const ctx = makeCtx();
      setAuth(ctx);
      const body = cloneFixture();
      body.usage[window].status = "unknown";
      setResponse(ctx, body);

      const plugin = await loadPlugin();
      expect(() => plugin.probe(ctx)).toThrow("Usage unavailable");
    },
  );

  it.each([
    ["percent string", (window) => { window.percent = "1"; }],
    ["percent null", (window) => { window.percent = null; }],
    ["percent boolean", (window) => { window.percent = true; }],
    ["percent nonfinite", (window) => { window.percent = 1e999; }],
    ["missing percent", (window) => { delete window.percent; }],
    ["missing reset", (window) => { delete window.resetsAt; }],
    ["reset without timezone", (window) => { window.resetsAt = "2026-09-05T05:00:00"; }],
    ["invalid reset", (window) => { window.resetsAt = "tomorrow"; }],
    ["nonexistent date", (window) => { window.resetsAt = "2026-02-30T00:00:00.000Z"; }],
  ])("rejects malformed response: %s", async (name, mutate) => {
    const ctx = makeCtx();
    setAuth(ctx);
    const body = cloneFixture();
    mutate(body.usage.rolling);
    // JSON.stringify converts Infinity to null; preserve overflow in the wire JSON.
    setResponse(ctx, name === "percent nonfinite"
      ? JSON.stringify(body).replace('"percent":null', '"percent":1e999')
      : body);

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Usage unavailable");
  });

  it("rejects invalid JSON and non-object JSON responses", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    const plugin = await loadPlugin();
    setResponse(ctx, "not-json");
    expect(() => plugin.probe(ctx)).toThrow("Usage unavailable");

    setResponse(ctx, "null");
    expect(() => plugin.probe(ctx)).toThrow("Usage unavailable");
  });

  it("refetches each probe and never reuses a successful snapshot after failure", async () => {
    const ctx = makeCtx();
    setAuth(ctx);
    ctx.host.http.request
      .mockReturnValueOnce({ status: 200, bodyText: JSON.stringify(FIXTURE) })
      .mockReturnValueOnce({ status: 500, bodyText: JSON.stringify({ error: "failed" }) });
    const plugin = await loadPlugin();

    expect(plugin.probe(ctx).lines[0].used).toBe(3);
    expect(() => plugin.probe(ctx)).toThrow("Usage unavailable");
    expect(ctx.host.http.request).toHaveBeenCalledTimes(2);
  });

  it("reads auth from OPENCODE_DATA_DIR before the default path", async () => {
    const ctx = makeCtx();
    ctx.host.env.get.mockImplementation((name) =>
      name === "OPENCODE_DATA_DIR" ? "/tmp/custom-opencode" : null,
    );
    ctx.host.fs.writeText(
      "/tmp/custom-opencode/auth.json",
      JSON.stringify({ "opencode-go": { type: "api-key", key: "go-key" } }),
    );
    setResponse(ctx);
    const result = (await loadPlugin()).probe(ctx);
    expect(result.plan).toBe("Go");
    expect(result.lines[0].label).toBe("Session");
  });

  it("reads auth from XDG_DATA_HOME/opencode when OPENCODE_DATA_DIR is unset", async () => {
    const ctx = makeCtx();
    ctx.host.env.get.mockImplementation((name) =>
      name === "XDG_DATA_HOME" ? "/tmp/xdg-data" : null,
    );
    ctx.host.fs.writeText(
      "/tmp/xdg-data/opencode/auth.json",
      JSON.stringify({ "opencode-go": { type: "api-key", key: "go-key" } }),
    );
    setResponse(ctx);
    const result = (await loadPlugin()).probe(ctx);
    expect(result.plan).toBe("Go");
    expect(result.lines[0].label).toBe("Session");
  });

  it("appends local Go spend and ignores Zen rows", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx);
    ctx.host.fs.writeText("~/.local/share/opencode/opencode.db", "sqlite");
    const today = Date.UTC(2026, 2, 6);
    const yesterday = Date.UTC(2026, 2, 5);
    ctx.host.sqlite.query.mockReturnValue(
      JSON.stringify([
        { t: today, cost: 1.5, tokens: 2000, provider: "opencode-go" },
        { t: yesterday, cost: 0.25, tokens: 500, provider: "opencode" },
      ]),
    );

    const result = (await loadPlugin()).probe(ctx);
    expect(result.plan).toBe("Go");
    expect(result.lines.find((line) => line.label === "Today").value).toBe("$1.50 · 2k tokens");
    expect(result.lines.find((line) => line.label === "Yesterday")).toBeUndefined();
    expect(result.lines.find((line) => line.label === "Last 30 Days").value).toBe("$1.50 · 2k tokens");
    vi.useRealTimers();
  });

  it("shows Go spend without Go meters on EntitlementError", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx, { error: { type: "EntitlementError" } }, 403);
    ctx.host.fs.writeText("~/.local/share/opencode/opencode.db", "sqlite");
    ctx.host.sqlite.query.mockReturnValue(
      JSON.stringify([{ t: Date.UTC(2026, 2, 6), cost: 2, tokens: 1000, provider: "opencode-go" }]),
    );

    const result = (await loadPlugin()).probe(ctx);
    expect(result.plan).toBeNull();
    expect(result.lines.find((line) => line.label === "Session")).toBeUndefined();
    expect(result.lines.find((line) => line.label === "Today").value).toBe("$2.00 · 1k tokens");
    expect(result.statuses).toBeUndefined();
    vi.useRealTimers();
  });

  it("throws on EntitlementError when local spend is only Zen", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));
    const ctx = makeCtx();
    setAuth(ctx);
    setResponse(ctx, { error: { type: "EntitlementError" } }, 403);
    ctx.host.fs.writeText("~/.local/share/opencode/opencode.db", "sqlite");
    ctx.host.sqlite.query.mockReturnValue(
      JSON.stringify([{ t: Date.UTC(2026, 2, 6), cost: 2, tokens: 1000, provider: "opencode" }]),
    );

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("No Go subscription");
    vi.useRealTimers();
  });

  it("throws when auth is missing and local spend is only Zen", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));
    const ctx = makeCtx();
    ctx.host.fs.writeText("~/.local/share/opencode/opencode.db", "sqlite");
    ctx.host.sqlite.query.mockReturnValue(
      JSON.stringify([{ t: Date.UTC(2026, 2, 6), cost: 2, tokens: 1000, provider: "opencode" }]),
    );

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Authentication unavailable");
    expect(ctx.host.http.request).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it.each([
    ["weekday morning peak start", "2026-08-24T01:00:00.000Z", "DeepSeek Peak", "danger"],
    ["weekday morning inside peak window", "2026-08-24T02:30:00.000Z", "DeepSeek Peak", "danger"],
    ["weekday morning peak end", "2026-08-24T04:00:00.000Z", "DeepSeek Off-Peak", "positive"],
    ["weekday lunch gap", "2026-08-24T05:00:00.000Z", "DeepSeek Off-Peak", "positive"],
    ["weekday afternoon peak start", "2026-08-24T06:00:00.000Z", "DeepSeek Peak", "danger"],
    ["weekday afternoon inside peak window", "2026-08-24T08:00:00.000Z", "DeepSeek Peak", "danger"],
    ["weekday afternoon peak end", "2026-08-28T10:00:00.000Z", "DeepSeek Off-Peak", "positive"],
    ["weekday before morning window", "2026-08-24T00:59:59.999Z", "DeepSeek Off-Peak", "positive"],
    ["weekend during morning peak clock hours", "2026-08-29T02:00:00.000Z", "DeepSeek Off-Peak", "positive"],
    ["weekend during afternoon peak clock hours", "2026-08-30T08:00:00.000Z", "DeepSeek Off-Peak", "positive"],
  ])("classifies %s", async (_caseName, nowIso, text, tone) => {
    const result = await probeAt(nowIso);
    expect(result.statuses).toEqual([{ text, tone }]);
    expect(result.lines.find((line) => line.label === "Peak Hours")).toBeUndefined();
  });

  it("keeps quota metrics unchanged when adding DeepSeek peak status", async () => {
    const result = await probeAt("2026-08-24T08:00:00.000Z");
    expect(result.statuses).toEqual([{ text: "DeepSeek Peak", tone: "danger" }]);
    expect(result.lines.find((line) => line.label === "Session")).toMatchObject({
      type: "progress",
      used: 3,
      limit: 100,
      resetsAt: "2026-09-05T05:00:00.000Z",
      periodDurationMs: 5 * 60 * 60 * 1000,
    });
    expect(result.lines.find((line) => line.label === "Weekly")).toMatchObject({
      used: 1,
      limit: 100,
      resetsAt: "2026-09-07T00:00:00.000Z",
    });
    expect(result.lines.find((line) => line.label === "Monthly")).toMatchObject({
      used: 0,
      limit: 100,
      resetsAt: "2026-10-01T00:00:00.000Z",
    });
  });
});
