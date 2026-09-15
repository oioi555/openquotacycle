import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCtx } from "../test-helpers.js";
import pluginManifest from "./plugin.json";

const AUTH_PATH = "~/.grok/auth.json";
const BILLING_URL = "https://cli-chat-proxy.grok.com/v1/billing?format=credits";
const AUTH_KEY_NAME = "https://auth.x.ai::b1a00492-073a-47ea-816f-4c329264a828";

const loadPlugin = async () => {
  await import("./plugin.js");
  return globalThis.__quotracker_plugin;
};

// Grok Build keys are JWTs; build a deterministic fake so tests never carry a
// real token. `exp` is an epoch-seconds claim.
function makeJwt(expSeconds) {
  const enc = (obj) =>
    btoa(JSON.stringify(obj)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  return `${enc({ alg: "none" })}.${enc({ exp: expSeconds })}.sig`;
}

function extraUsage(cap) {
  const value = cap === Math.round(cap) ? String(Math.round(cap)) + " cap" : String(cap) + " cap";
  return { type: "text", label: "Extra Usage", value };
}

function setAuth(ctx, entries) {
  ctx.host.fs.writeText(AUTH_PATH, JSON.stringify(entries));
}

function setDefaultAuth(ctx, overrides = {}) {
  setAuth(ctx, {
    [AUTH_KEY_NAME]: {
      key: "grok-access-token",
      refresh_token: "grok-refresh-token",
      expires_at: "2099-01-01T00:00:00.000Z",
      ...overrides,
    },
  });
}

function setBillingResponse(ctx, body, status = 200, token = "grok-access-token") {
  ctx.host.http.request.mockImplementation((opts) => {
    expect(opts.method).toBe("GET");
    expect(opts.url).toBe("https://cli-chat-proxy.grok.com/v1/billing?format=credits");
    expect(opts.headers.Authorization).toBe("Bearer " + token);
    expect(opts.headers.Accept).toBe("application/json");
    expect(opts.headers["User-Agent"]).toBe("Quotracker");
    expect(opts.headers["X-XAI-Token-Auth"]).toBe("xai-grok-cli");
    expect(opts.headers["x-grok-client-surface"]).toBe("grok-build");
    expect(opts.headers["x-grok-client-version"]).toBe("1.0.0");
    return { status, bodyText: JSON.stringify(body) };
  });
}

describe("grok plugin", () => {
  beforeEach(() => {
    delete globalThis.__quotracker_plugin;
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("ships plugin metadata with links and expected line layout", () => {
    expect(pluginManifest.id).toBe("grok");
    expect(pluginManifest.name).toBe("Grok");
    expect(pluginManifest.brandColor).toBe("#000000");
    expect(pluginManifest.links).toEqual([{ label: "Usage", url: "https://grok.com/?_s=usage" }]);
    expect(pluginManifest.lines).toEqual([
      { type: "progress", label: "Weekly", scope: "overview", visibleByDefault: true },
      { type: "text", label: "Extra Usage", scope: "overview" },
    ]);
  });

  it("throws when Grok Build auth.json is absent", async () => {
    const ctx = makeCtx();
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Not connected. Log in to Grok in Grok Build first.",
    );
  });

  it("throws when auth.json is not valid json", async () => {
    const ctx = makeCtx();
    ctx.host.fs.writeText(AUTH_PATH, "{not valid json");
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Not connected. Log in to Grok in Grok Build first.",
    );
  });

  it("throws when no entry has a usable key", async () => {
    const ctx = makeCtx();
    setAuth(ctx, {
      "https://auth.x.ai::some-client": { refresh_token: "x", expires_at: "2099-01-01T00:00:00.000Z" },
      "https://auth.x.ai::other-client": { key: "   " },
    });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Not connected. Log in to Grok in Grok Build first.",
    );
  });

  it("scans all entries and uses the first object with a non-empty key", async () => {
    const ctx = makeCtx();
    setAuth(ctx, {
      "some::client": { key: "" },
      "other::client": "not-an-object",
      [AUTH_KEY_NAME]: {
        key: "grok-access-token",
        expires_at: "2099-01-01T00:00:00.000Z",
      },
    });
    setBillingResponse(ctx, {
      config: { currentPeriod: { type: "WEEKLY" }, creditUsagePercent: 40 },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].used).toBe(40);
  });

  it("throws a start-Grok-Build error when the token is expired", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));

    const ctx = makeCtx();
    setDefaultAuth(ctx, { expires_at: "2026-03-01T00:00:00.000Z" });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Grok session expired. Start Grok Build and try again.",
    );
    expect(ctx.host.http.request).not.toHaveBeenCalled();
  });

  it("accepts extra fractional seconds on expires_at", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));
    const ctx = makeCtx();
    setDefaultAuth(ctx, { expires_at: "2099-01-01T00:00:00.123456789Z" });
    setBillingResponse(ctx, {
      config: { currentPeriod: { type: "WEEKLY" }, creditUsagePercent: 40 },
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.plan).toBe("SuperGrok");
    expect(result.lines[0].used).toBe(40);
  });

  it("uses the JWT exp claim as a fallback when expires_at is missing", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));

    const ctx = makeCtx();
    setAuth(ctx, {
      [AUTH_KEY_NAME]: { key: makeJwt(1767225600) }, // exp = 2026-01-01, in the past
    });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Grok session expired. Start Grok Build and try again.",
    );
    expect(ctx.host.http.request).not.toHaveBeenCalled();
  });

  it("accepts a JWT key with a future exp when expires_at is missing", async () => {
    const ctx = makeCtx();
    setAuth(ctx, {
      [AUTH_KEY_NAME]: { key: makeJwt(4102444800) }, // exp = 2100-01-01
    });
    setBillingResponse(
      ctx,
      { config: { currentPeriod: { type: "WEEKLY" }, creditUsagePercent: 10 } },
      200,
      makeJwt(4102444800),
    );

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].used).toBe(10);
  });

  it("treats a non-JWT key without expires_at as valid", async () => {
    const ctx = makeCtx();
    setAuth(ctx, {
      [AUTH_KEY_NAME]: { key: "grok-access-token" },
    });
    setBillingResponse(ctx, {
      config: { currentPeriod: { type: "WEEKLY" }, creditUsagePercent: 10 },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].used).toBe(10);
  });

  it("shows the period label and usage from the credits response", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: {
          type: "WEEKLY",
          start: "2026-03-02T00:00:00.000Z",
          end: "2026-03-09T00:00:00.000Z",
        },
        creditUsagePercent: 40,
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);

    expect(result.plan).toBe("SuperGrok");
    expect(result.lines).toEqual([
      {
        type: "progress",
        label: "Weekly",
        used: 40,
        limit: 100,
        format: { kind: "percent" },
        resetsAt: "2026-03-09T00:00:00.000Z",
        periodDurationMs: 7 * 24 * 60 * 60 * 1000,
      },
    ]);
  });

  it("treats an omitted creditUsagePercent as 0% used", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: {
          type: "WEEKLY",
          start: "2026-03-02T00:00:00.000Z",
          end: "2026-03-09T00:00:00.000Z",
        },
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].used).toBe(0);
    expect(result.lines[0].resetsAt).toBe("2026-03-09T00:00:00.000Z");
    expect(result.lines[0].periodDurationMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("uses billingPeriodEnd when currentPeriod has no end", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: { type: "WEEKLY" },
        billingPeriodEnd: "2026-03-09T00:00:00.000Z",
        creditUsagePercent: 10,
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].resetsAt).toBe("2026-03-09T00:00:00.000Z");
  });

  it("omits non-weekly period progress", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: { type: "MONTHLY", end: "2026-04-01T00:00:00.000Z" },
        creditUsagePercent: 12.5,
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((line) => line.label === "Weekly")).toBeUndefined();
    expect(result.lines.find((line) => line.label === "Monthly")).toBeUndefined();
    expect(result.lines.find((line) => line.label === "Daily")).toBeUndefined();
    expect(result.lines).toEqual([]);
  });

  it("falls back to a 7-day period when a weekly window has no boundaries", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: { currentPeriod: { type: "WEEKLY" }, creditUsagePercent: 30 },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].periodDurationMs).toBe(7 * 24 * 60 * 60 * 1000);
    expect(result.lines[0].resetsAt).toBeUndefined();
  });

  it("does not persist a snapshot for a monthly window", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: { currentPeriod: { type: "MONTHLY" }, creditUsagePercent: 12.5 },
    });

    const plugin = await loadPlugin();
    plugin.probe(ctx);
    expect(ctx.host.fs.exists("/tmp/quotracker-test/plugin/quota-snapshot.json")).toBe(false);
  });

  it("omits Daily and Period progress lines", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: { currentPeriod: { type: "DAILY" }, creditUsagePercent: 5 },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((line) => line.type === "progress")).toBeUndefined();
    expect(result.lines).toEqual([]);
  });

  it("omits unknown period progress", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: { currentPeriod: { type: "BILLING" }, creditUsagePercent: 5 },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((line) => line.label === "Period")).toBeUndefined();
    expect(result.lines).toEqual([]);
  });

  it("omits periodDurationMs when the window boundaries are degenerate", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: {
          type: "WEEKLY",
          start: "2026-03-09T00:00:00.000Z",
          end: "2026-03-02T00:00:00.000Z",
        },
        creditUsagePercent: 10,
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].periodDurationMs).toBeUndefined();
    expect(result.lines[0].resetsAt).toBe("2026-03-02T00:00:00.000Z");
  });

  it("keeps the billingPeriodEnd fallback for resetsAt and duration", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: { type: "WEEKLY", start: "2026-03-02T00:00:00.000Z" },
        billingPeriodEnd: "2026-03-09T00:00:00.000Z",
        creditUsagePercent: 20,
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].resetsAt).toBe("2026-03-09T00:00:00.000Z");
    expect(result.lines[0].periodDurationMs).toBe(7 * 24 * 60 * 60 * 1000);
  });

  it("omits Extra Usage when onDemandCap is 0", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: {
          type: "WEEKLY",
          start: "2026-03-02T00:00:00.000Z",
          end: "2026-03-09T00:00:00.000Z",
        },
        creditUsagePercent: 40,
        onDemandCap: { val: 0 },
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((line) => line.label === "Weekly").used).toBe(40);
    expect(result.lines.find((line) => line.label === "Extra Usage")).toBeUndefined();
  });

  it("shows Extra Usage cap when onDemandCap.val is present", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: {
          type: "WEEKLY",
          start: "2026-03-02T00:00:00.000Z",
          end: "2026-03-09T00:00:00.000Z",
        },
        creditUsagePercent: 40,
        onDemandCap: { val: 5 },
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((line) => line.label === "Weekly").used).toBe(40);
    expect(result.lines.find((line) => line.label === "Extra Usage")).toEqual(extraUsage(5));
  });

  it("clamps usage at 100", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: {
        currentPeriod: { type: "WEEKLY", end: "2026-03-09T00:00:00.000Z" },
        creditUsagePercent: 250,
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines[0].used).toBe(100);
  });

  it("throws on HTTP error responses", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, { error: "boom" }, 500);

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Usage request failed (HTTP 500). Try again later.",
    );
  });

  it("throws a start-Grok-Build error on 401", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, { error: "unauthorized" }, 401);

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Grok session expired. Start Grok Build and try again.",
    );
  });

  it("throws when the response body is not valid json", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    ctx.host.http.request.mockReturnValue({ status: 200, bodyText: "not-json" });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Usage response invalid. Try again later.");
  });

  it("throws when the response has no quota window", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, { unrelated: "data" });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "No Grok quota data available. Try again later.",
    );
  });

  it("keeps Extra Usage when there is no weekly window but PAYG is enabled", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: { onDemandCap: { val: 2500 } },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((line) => line.label === "Weekly")).toBeUndefined();
    expect(result.lines).toEqual([extraUsage(2500)]);
  });

  it("throws when creditUsagePercent is not numeric", async () => {
    const ctx = makeCtx();
    setDefaultAuth(ctx);
    setBillingResponse(ctx, {
      config: { currentPeriod: { type: "WEEKLY" }, creditUsagePercent: "lots" },
    });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Grok usage response invalid. Try again later.");
  });

  describe("stale snapshot fallback", () => {
    const SNAPSHOT_PATH = "/tmp/quotracker-test/plugin/quota-snapshot.json";
    const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

    function setSnapshot(ctx, window = {}) {
      ctx.host.fs.writeText(
        SNAPSHOT_PATH,
        JSON.stringify({
          savedAt: "2026-03-05T00:00:00.000Z",
          window: {
            used: 55,
            label: "Weekly",
            resetsAt: "2026-03-09T00:00:00.000Z",
            periodDurationMs: WEEK_MS,
            ...window,
          },
        }),
      );
    }

    function expectStale(result, reason) {
      expect(result.plan).toBe("SuperGrok");
      expect(result.lines).toHaveLength(1);
      expect(result.lines[0].type).toBe("progress");
      expect(result.statuses).toEqual([{ text: "Stale", tone: "warning" }]);
      expect(result.error).toBe(reason);
    }

    it("persists only display fields on success and never tokens", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx);
      setBillingResponse(ctx, {
        config: {
          currentPeriod: {
            type: "WEEKLY",
            start: "2026-03-02T00:00:00.000Z",
            end: "2026-03-09T00:00:00.000Z",
          },
          creditUsagePercent: 40,
        },
      });

      const plugin = await loadPlugin();
      plugin.probe(ctx);

      const snapshotText = ctx.host.fs.readText(SNAPSHOT_PATH);
      expect(snapshotText).toBeTruthy();
      expect(snapshotText).not.toContain("access");
      expect(snapshotText).not.toContain("refresh");
      expect(snapshotText).not.toContain("token");
      expect(snapshotText).not.toContain("grok-access-token");

      const snapshot = JSON.parse(snapshotText);
      expect(snapshot.window).toEqual({
        used: 40,
        label: "Weekly",
        resetsAt: "2026-03-09T00:00:00.000Z",
        periodDurationMs: WEEK_MS,
      });
    });

    it("keeps serving the live probe when the snapshot write fails", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx);
      setBillingResponse(ctx, {
        config: { currentPeriod: { type: "WEEKLY" }, creditUsagePercent: 10 },
      });
      ctx.host.fs.writeText.mockImplementation((path) => {
        if (String(path).endsWith("quota-snapshot.json")) {
          throw new Error("disk full");
        }
        return undefined;
      });

      const plugin = await loadPlugin();
      const result = plugin.probe(ctx);
      expect(result.lines[0].type).toBe("progress");
      expect(result.lines.find((line) => line.label === "Extra Usage")).toBeUndefined();
      expect(ctx.host.log.warn).toHaveBeenCalledWith(
        expect.stringContaining("failed to persist quota snapshot"),
      );
    });

    it("shows stale progress + Stale header chip when expired with a snapshot", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));

      const ctx = makeCtx();
      setDefaultAuth(ctx, { expires_at: "2026-03-01T00:00:00.000Z" });
      setSnapshot(ctx);

      const plugin = await loadPlugin();
      const result = plugin.probe(ctx);

      expectStale(
        result,
        "Grok session expired. Start Grok Build and try again.",
      );
      expect(result.lines[0]).toEqual({
        type: "progress",
        label: "Weekly",
        used: 55,
        limit: 100,
        format: { kind: "percent" },
        resetsAt: "2026-03-09T00:00:00.000Z",
        periodDurationMs: WEEK_MS,
      });
      expect(ctx.host.http.request).not.toHaveBeenCalled();
    });

    it("shows stale when auth is missing but a snapshot exists", async () => {
      const ctx = makeCtx();
      setSnapshot(ctx);

      const plugin = await loadPlugin();
      expectStale(
        plugin.probe(ctx),
        "Not connected. Log in to Grok in Grok Build first.",
      );
    });

    it("shows stale on 401 with a snapshot", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx);
      setSnapshot(ctx);
      setBillingResponse(ctx, { error: "unauthorized" }, 401);

      const plugin = await loadPlugin();
      expectStale(
        plugin.probe(ctx),
        "Grok session expired. Start Grok Build and try again.",
      );
    });

    it("shows stale on 500 with a snapshot", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx);
      setSnapshot(ctx);
      setBillingResponse(ctx, { error: "boom" }, 500);

      const plugin = await loadPlugin();
      expectStale(
        plugin.probe(ctx),
        "Usage request failed (HTTP 500). Try again later.",
      );
    });

    it("shows stale on a network error with a snapshot", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx);
      setSnapshot(ctx);
      ctx.host.http.request.mockImplementation(() => {
        throw new Error("connection refused");
      });

      const plugin = await loadPlugin();
      expectStale(
        plugin.probe(ctx),
        "Usage request failed. Check your connection.",
      );
    });

    it("still errors when expired with no snapshot", async () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"));

      const ctx = makeCtx();
      setDefaultAuth(ctx, { expires_at: "2026-03-01T00:00:00.000Z" });

      const plugin = await loadPlugin();
      expect(() => plugin.probe(ctx)).toThrow(
        "Grok session expired. Start Grok Build and try again.",
      );
    });

    it("still errors on 500 with no snapshot", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx);
      setBillingResponse(ctx, { error: "boom" }, 500);

      const plugin = await loadPlugin();
      expect(() => plugin.probe(ctx)).toThrow(
        "Usage request failed (HTTP 500). Try again later.",
      );
    });

    it("ignores a malformed snapshot and falls back to an error", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx, { expires_at: "2026-03-01T00:00:00.000Z" });
      ctx.host.fs.writeText(SNAPSHOT_PATH, "{not valid json");

      const plugin = await loadPlugin();
      expect(() => plugin.probe(ctx)).toThrow(
        "Grok session expired. Start Grok Build and try again.",
      );
    });

    it("ignores snapshots with invalid window fields", async () => {
      const cases = [
        { window: { used: -1, label: "Weekly" } },
        { window: { used: "lots", label: "Weekly" } },
        { window: { used: 10, label: "" } },
        { window: { used: 10, label: "Weekly", periodDurationMs: -5 } },
        { window: { used: 10, label: "Weekly", resetsAt: "not-a-date" } },
      ];
      for (const snapshot of cases) {
        const ctx = makeCtx();
        setDefaultAuth(ctx, { expires_at: "2026-03-01T00:00:00.000Z" });
        ctx.host.fs.writeText(SNAPSHOT_PATH, JSON.stringify(snapshot));

        const plugin = await loadPlugin();
        expect(() => plugin.probe(ctx)).toThrow(
          "Grok session expired. Start Grok Build and try again.",
        );
      }
    });

    it("overwrites the snapshot with fresh values on a later success", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx);
      setSnapshot(ctx, { used: 99, label: "Weekly" });
      setBillingResponse(ctx, {
        config: {
          currentPeriod: { type: "WEEKLY", start: "2026-03-02T00:00:00.000Z", end: "2026-03-09T00:00:00.000Z" },
          creditUsagePercent: 25,
        },
      });

      const plugin = await loadPlugin();
      const result = plugin.probe(ctx);
      expect(result.lines[0].used).toBe(25);
      expect(result.lines.find((line) => line.label === "Extra Usage")).toBeUndefined();

      const snapshot = JSON.parse(ctx.host.fs.readText(SNAPSHOT_PATH));
      expect(snapshot.window.used).toBe(25);
    });

    it("never writes to auth.json or calls OAuth endpoints", async () => {
      const ctx = makeCtx();
      setDefaultAuth(ctx);
      setBillingResponse(ctx, {
        config: { currentPeriod: { type: "WEEKLY" }, creditUsagePercent: 10 },
      });

      const authBefore = ctx.host.fs.readText(AUTH_PATH);
      ctx.host.fs.writeText.mockClear();
      ctx.host.http.request.mockClear();

      const plugin = await loadPlugin();
      plugin.probe(ctx);

      const writePaths = ctx.host.fs.writeText.mock.calls.map((call) => String(call[0]));
      expect(writePaths).not.toContain(AUTH_PATH);
      expect(ctx.host.fs.readText(AUTH_PATH)).toBe(authBefore);

      const requestUrls = ctx.host.http.request.mock.calls.map((call) => call[0].url);
      expect(requestUrls).toEqual([BILLING_URL]);
      // No OAuth/token endpoints, no refresh flow.
      expect(requestUrls.join(" ")).not.toMatch(/auth\.x\.ai|oauth|token/i);
    });
  });
});
