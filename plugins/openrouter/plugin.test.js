import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { makeCtx } from "../test-helpers.js";
import pluginManifest from "./plugin.json";

const CONFIG_PATH = "~/.config/openquotacycle/openrouter.json";
const AUTH_PATH = "~/.local/share/opencode/auth.json";
const KEY_URL = "https://openrouter.ai/api/v1/key";
const CREDITS_URL = "https://openrouter.ai/api/v1/credits";
const TEST_KEY = "sk-or-v1-test-key";
const CONFIG_KEY = "sk-or-v1-config-key";
const ENV_KEY = "sk-or-v1-env-key";
const OPENCODE_KEY = "sk-or-v1-opencode-key";

const loadPlugin = async () => {
  await import("./plugin.js");
  return globalThis.__openquotacycle_plugin;
};

function setAuth(ctx, key = OPENCODE_KEY) {
  ctx.host.fs.writeText(
    AUTH_PATH,
    JSON.stringify({ openrouter: { type: "api", key } }),
  );
}

function setConfig(ctx, value) {
  ctx.host.fs.writeText(CONFIG_PATH, JSON.stringify(value));
}

function setEnvKey(ctx, key) {
  ctx.host.env.get.mockImplementation((name) => (name === "OPENROUTER_API_KEY" ? key : null));
}

function keyBody(overrides = {}) {
  return {
    data: {
      label: "my key",
      usage: 40,
      limit: 100,
      is_free_tier: false,
      limit_remaining: 60,
      usage_daily: 10,
      usage_weekly: 25,
      usage_monthly: 40,
      limit_reset: "2026-03-01T00:00:00.000Z",
      ...overrides,
    },
  };
}

function creditsBody(totalCredits = 20, totalUsage = 5) {
  return { data: { total_credits: totalCredits, total_usage: totalUsage } };
}

function mockEndpoints(ctx, { credits, key, expectedKey = TEST_KEY } = {}) {
  ctx.host.http.request.mockImplementation((opts) => {
    expect(opts.method).toBe("GET");
    expect(opts.headers.Authorization).toBe("Bearer " + expectedKey);
    expect(opts.headers.Accept).toBe("application/json");
    if (opts.url === CREDITS_URL) {
      const resp = credits ?? { status: 200, body: creditsBody() };
      return { status: resp.status ?? 200, bodyText: resp.bodyText ?? JSON.stringify(resp.body) };
    }
    if (opts.url === KEY_URL) {
      const resp = key ?? { status: 200, body: keyBody() };
      return { status: resp.status ?? 200, bodyText: resp.bodyText ?? JSON.stringify(resp.body) };
    }
    throw new Error("unexpected url " + opts.url);
  });
}

describe("openrouter plugin", () => {
  beforeEach(() => {
    delete globalThis.__openquotacycle_plugin;
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("ships plugin metadata with links and expected line layout", () => {
    const manifest = pluginManifest;

    expect(manifest.id).toBe("openrouter");
    expect(manifest.name).toBe("OpenRouter");
    expect(manifest.brandColor).toBe("#FFFFFF");
    expect(manifest.links).toEqual([
      { label: "Activity", url: "https://openrouter.ai/activity" },
      { label: "Credits", url: "https://openrouter.ai/settings/credits" },
    ]);
    expect(manifest.lines).toEqual([
      { type: "progress", label: "Key Limit", scope: "overview", visibleByDefault: true },
      { type: "progress", label: "Credits", scope: "overview", visibleByDefault: true },
      { type: "text", label: "Balance", scope: "overview" },
      { type: "text", label: "Monthly", scope: "overview" },
      { type: "text", label: "Weekly", scope: "overview" },
      { type: "text", label: "Today", scope: "detail" },
    ]);
  });

  it("throws when no key source is present", async () => {
    const ctx = makeCtx();
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "No OpenRouter API key. Set OPENROUTER_API_KEY or add it to ~/.config/openquotacycle/openrouter.json.",
    );
  });

  it("throws when the openrouter entry has no key", async () => {
    const ctx = makeCtx();
    ctx.host.fs.writeText(AUTH_PATH, JSON.stringify({ openrouter: { type: "api" } }));
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "No OpenRouter API key. Set OPENROUTER_API_KEY or add it to ~/.config/openquotacycle/openrouter.json.",
    );
  });

  it("uses the config-file key before env and OpenCode", async () => {
    const ctx = makeCtx();
    setConfig(ctx, { apiKey: CONFIG_KEY });
    setEnvKey(ctx, ENV_KEY);
    setAuth(ctx, OPENCODE_KEY);
    mockEndpoints(ctx, { expectedKey: CONFIG_KEY });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((line) => line.label === "Credits")).toBeTruthy();
    expect(ctx.host.http.request.mock.calls.map((call) => call[0].url).sort()).toEqual([
      CREDITS_URL,
      KEY_URL,
    ]);
  });

  it("uses OPENROUTER_API_KEY when no config-file key is present", async () => {
    const ctx = makeCtx();
    setEnvKey(ctx, ENV_KEY);
    setAuth(ctx, OPENCODE_KEY);
    mockEndpoints(ctx, { expectedKey: ENV_KEY });

    const plugin = await loadPlugin();
    plugin.probe(ctx);
    expect(ctx.host.http.request.mock.calls[0][0].headers.Authorization).toBe("Bearer " + ENV_KEY);
  });

  it("falls back to the OpenCode auth.json key", async () => {
    const ctx = makeCtx();
    setAuth(ctx, OPENCODE_KEY);
    mockEndpoints(ctx, { expectedKey: OPENCODE_KEY });

    const plugin = await loadPlugin();
    plugin.probe(ctx);
    expect(ctx.host.http.request.mock.calls[0][0].headers.Authorization).toBe(
      "Bearer " + OPENCODE_KEY,
    );
  });

  it("accepts api_key and key fields in the config file", async () => {
    const ctx = makeCtx();
    setConfig(ctx, { api_key: CONFIG_KEY });
    mockEndpoints(ctx, { expectedKey: CONFIG_KEY });
    const plugin = await loadPlugin();
    plugin.probe(ctx);

    delete globalThis.__openquotacycle_plugin;
    vi.resetModules();
    const ctx2 = makeCtx();
    setConfig(ctx2, { key: CONFIG_KEY });
    mockEndpoints(ctx2, { expectedKey: CONFIG_KEY });
    const plugin2 = await loadPlugin();
    plugin2.probe(ctx2);
  });

  it("shows Credits and Balance from /credits plus Key Limit from current-window remaining", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, { expectedKey: TEST_KEY });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);

    expect(result.plan).toBe("Pay as you go");
    expect(result.lines).toEqual([
      {
        type: "progress",
        label: "Credits",
        used: 5,
        limit: 20,
        format: { kind: "dollars" },
      },
      { type: "text", label: "Balance", value: "$15.00" },
      { type: "text", label: "Today", value: "$10.00" },
      { type: "text", label: "Weekly", value: "$25.00" },
      { type: "text", label: "Monthly", value: "$40.00" },
      {
        type: "progress",
        label: "Key Limit",
        used: 40,
        limit: 100,
        format: { kind: "dollars" },
        resetsAt: "2026-03-01T00:00:00.000Z",
      },
    ]);
  });

  it("falls back to usage-derived remaining when limit_remaining is absent", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 500, body: { error: "boom" } },
      key: { body: { data: { usage: 30, limit: 100, limit_remaining: null } } },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const limit = result.lines.find((line) => line.label === "Key Limit");
    expect(limit.used).toBe(30);
    expect(limit.limit).toBe(100);
  });

  it("keeps key-period spend when /credits fails", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 500, body: { error: "boom" } },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((line) => line.label === "Credits")).toBeUndefined();
    expect(result.lines.find((line) => line.label === "Key Limit")).toMatchObject({
      used: 40,
      limit: 100,
    });
    expect(result.lines.find((line) => line.label === "Today")).toEqual({
      type: "text",
      label: "Today",
      value: "$10.00",
    });
  });

  it("keeps Credits when /key fails", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      key: { status: 500, body: { error: "boom" } },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines).toEqual([
      {
        type: "progress",
        label: "Credits",
        used: 5,
        limit: 20,
        format: { kind: "dollars" },
      },
      { type: "text", label: "Balance", value: "$15.00" },
    ]);
  });

  it("shows period spend without a Key Limit when the key has no numeric cap", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 404, body: { error: "missing" } },
      key: {
        body: {
          data: {
            usage: 0,
            limit: null,
            is_free_tier: true,
            limit_remaining: null,
            usage_daily: 0,
            usage_weekly: 0,
            usage_monthly: 0,
            limit_reset: null,
          },
        },
      },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);

    expect(result.plan).toBe("Free tier");
    expect(result.lines.every((line) => line.label !== "Key Limit")).toBe(true);
    expect(result.lines).toEqual([
      { type: "text", label: "Today", value: "$0.00" },
      { type: "text", label: "Weekly", value: "$0.00" },
      { type: "text", label: "Monthly", value: "$0.00" },
    ]);
  });

  it("treats a zero key limit as no Key Limit bar", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 500, body: {} },
      key: { body: { data: { usage: 0, limit: 0, usage_daily: 0, usage_weekly: 0, usage_monthly: 0 } } },
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.some((line) => line.label === "Key Limit")).toBe(false);
    expect(result.lines.find((line) => line.label === "Today").value).toBe("$0.00");
  });

  it("throws a clear error when key accounting is invalid and credits produced no rows", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 500, body: {} },
      key: { body: { data: { usage: 10, limit: 100, limit_remaining: "lots" } } },
    });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("OpenRouter response invalid. Try again later.");
  });

  it("throws a clear error when limit_remaining is negative and credits produced no rows", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 500, body: {} },
      key: { body: { data: { usage: 10, limit: 100, limit_remaining: -1 } } },
    });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("OpenRouter response invalid. Try again later.");
  });

  it("throws a clear error when limit_remaining exceeds limit and credits produced no rows", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 500, body: {} },
      key: { body: { data: { usage: 10, limit: 100, limit_remaining: 150 } } },
    });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("OpenRouter response invalid. Try again later.");
  });

  it("throws a key-invalid error when both endpoints reject the key", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 401, body: { error: "unauthorized" } },
      key: { status: 403, body: { error: "forbidden" } },
    });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "OpenRouter API key invalid. Update the key and try again.",
    );
  });

  it("throws on HTTP error responses when neither endpoint produced rows", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    mockEndpoints(ctx, {
      expectedKey: TEST_KEY,
      credits: { status: 500, body: { error: "boom" } },
      key: { status: 500, body: { error: "boom" } },
    });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed (HTTP 500). Try again later.");
  });

  it("throws when both response bodies are not valid json", async () => {
    const ctx = makeCtx();
    setAuth(ctx, TEST_KEY);
    ctx.host.http.request.mockReturnValue({ status: 200, bodyText: "not-json" });

    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("OpenRouter response invalid. Try again later.");
  });
});
