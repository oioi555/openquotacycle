import { beforeEach, describe, expect, it, vi } from "vitest";
import { makePluginTestContext } from "../test-helpers.js";
import pluginManifest from "./plugin.json";

const loadPlugin = async () => {
  await import("./plugin.js");
  return globalThis.__quotracker_plugin;
};

function makeUsageResponse(overrides = {}) {
  return {
    copilot_plan: "pro",
    quota_reset_date: "2099-01-15T00:00:00Z",
    quota_snapshots: {
      premium_interactions: {
        percent_remaining: 80,
        entitlement: 300,
        remaining: 240,
        quota_id: "premium",
      },
      chat: {
        percent_remaining: 95,
        entitlement: 1000,
        remaining: 950,
        quota_id: "chat",
      },
    },
    ...overrides,
  };
}

function setKeychainToken(ctx, token) {
  ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
    if (service === "Quotracker-copilot") return JSON.stringify({ token });
    return null;
  });
}

function setGhCliKeychain(ctx, value) {
  ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
    if (service === "gh:github.com") return value;
    return null;
  });
}

function setStateFileToken(ctx, token) {
  ctx.host.fs.writeText(
    ctx.app.pluginDataDir + "/auth.json",
    JSON.stringify({ token }),
  );
}

function mockUsageOk(ctx, body) {
  ctx.host.http.request.mockReturnValue({
    status: 200,
    bodyText: JSON.stringify(body || makeUsageResponse()),
  });
}

describe("copilot plugin", () => {
  beforeEach(() => {
    delete globalThis.__quotracker_plugin;
    if (vi.resetModules) vi.resetModules();
  });

  it("ships plugin metadata with OpenQuota quick links", () => {
    expect(pluginManifest.id).toBe("copilot");
    expect(pluginManifest.links).toEqual([
      { label: "Status", url: "https://www.githubstatus.com/" },
      { label: "Dashboard", url: "https://github.com/settings/billing" },
    ]);
  });

  it("throws when no token found", async () => {
    const ctx = makePluginTestContext();
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Not signed in. Sign in to Copilot in an editor or run `gh auth login`.",
    );
  });

  it("loads token from app keychain", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "ghu_keychain");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((l) => l.label === "Credits")).toBeTruthy();
    const call = ctx.host.http.request.mock.calls[0][0];
    expect(call.headers.Authorization).toBe("token ghu_keychain");
  });

  it("loads token from gh CLI keychain (plain)", async () => {
    const ctx = makePluginTestContext();
    setGhCliKeychain(ctx, "gho_plain_token");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((l) => l.label === "Credits")).toBeTruthy();
    const call = ctx.host.http.request.mock.calls[0][0];
    expect(call.headers.Authorization).toBe("token gho_plain_token");
  });

  it("loads token from gh CLI keychain (base64-encoded)", async () => {
    const ctx = makePluginTestContext();
    const encoded = ctx.base64.encode("gho_encoded_token");
    setGhCliKeychain(ctx, "go-keyring-base64:" + encoded);
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((l) => l.label === "Credits")).toBeTruthy();
    const call = ctx.host.http.request.mock.calls[0][0];
    expect(call.headers.Authorization).toBe("token gho_encoded_token");
  });

  it("loads token from state file", async () => {
    const ctx = makePluginTestContext();
    setStateFileToken(ctx, "ghu_state");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((l) => l.label === "Credits")).toBeTruthy();
    const call = ctx.host.http.request.mock.calls[0][0];
    expect(call.headers.Authorization).toBe("token ghu_state");
  });

  it("prefers gh CLI over cached token", async () => {
    const ctx = makePluginTestContext();
    ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
      if (service === "Quotracker-copilot")
        return JSON.stringify({ token: "ghu_keychain" });
      if (service === "gh:github.com") return "gho_ghcli";
      return null;
    });
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    const call = ctx.host.http.request.mock.calls[0][0];
    expect(call.headers.Authorization).toBe("token gho_ghcli");
  });

  it("prefers keychain over state file", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "ghu_keychain");
    setStateFileToken(ctx, "ghu_state");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    const call = ctx.host.http.request.mock.calls[0][0];
    expect(call.headers.Authorization).toBe("token ghu_keychain");
  });

  it("persists token from gh-cli to keychain and state file", async () => {
    const ctx = makePluginTestContext();
    setGhCliKeychain(ctx, "gho_persist");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    expect(ctx.host.keychain.writeGenericPassword).toHaveBeenCalledWith(
      "Quotracker-copilot",
      JSON.stringify({ token: "gho_persist" }),
    );
    const stateFile = ctx.host.fs.readText(
      ctx.app.pluginDataDir + "/auth.json",
    );
    expect(JSON.parse(stateFile).token).toBe("gho_persist");
  });

  it("does not persist token loaded from app keychain", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "ghu_already");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    expect(ctx.host.keychain.writeGenericPassword).not.toHaveBeenCalled();
  });

  it("renders both Credits and Chat lines for paid tier", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const credits = result.lines.find((l) => l.label === "Credits");
    const chat = result.lines.find((l) => l.label === "Chat");
    expect(credits).toBeTruthy();
    expect(credits.used).toBe(20); // 100 - 80
    expect(credits.limit).toBe(100);
    expect(chat).toBeTruthy();
    expect(chat.used).toBe(5); // 100 - 95
  });

  it("renders only Credits when Chat is missing", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify(
        makeUsageResponse({
          quota_snapshots: {
            premium_interactions: {
              percent_remaining: 50,
              entitlement: 300,
              remaining: 150,
              quota_id: "premium",
            },
          },
        }),
      ),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((l) => l.label === "Credits")).toBeTruthy();
    expect(result.lines.find((l) => l.label === "Chat")).toBeFalsy();
  });

  it("returns empty lines when both snapshots missing", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({ copilot_plan: "free" }),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines).toEqual([]);
  });

  it("returns plan label from copilot_plan", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.plan).toBe("Pro");
  });

  it("capitalizes multi-word plan labels", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify(
        makeUsageResponse({ copilot_plan: "business plus" }),
      ),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.plan).toBe("Business Plus");
  });

  it("propagates resetsAt from quota_reset_date", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const credits = result.lines.find((l) => l.label === "Credits");
    expect(credits.resetsAt).toBe("2099-01-15T00:00:00.000Z");
  });

  it("clamps usedPercent to 0 when percent_remaining > 100", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify(
        makeUsageResponse({
          quota_snapshots: {
            premium_interactions: {
              percent_remaining: 120,
              entitlement: 300,
              remaining: 360,
              quota_id: "premium",
            },
          },
        }),
      ),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((l) => l.label === "Credits").used).toBe(0);
  });

  it("throws on 401", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({ status: 401, bodyText: "" });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Token invalid. Run `gh auth login` to re-authenticate.");
  });

  it("throws on 403", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({ status: 403, bodyText: "" });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Token invalid. Run `gh auth login` to re-authenticate.");
  });

  it("throws on HTTP 500", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({ status: 500, bodyText: "" });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Usage request failed (HTTP 500). Try again later.",
    );
  });

  it("throws on network error", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockImplementation(() => {
      throw new Error("ECONNREFUSED");
    });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Usage request failed. Check your connection.",
    );
  });

  it("throws on invalid JSON response", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: "not-json",
    });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow(
      "Usage response invalid. Try again later.",
    );
  });

  it("uses 'token' auth header format (not 'Bearer')", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "ghu_format");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    const call = ctx.host.http.request.mock.calls[0][0];
    expect(call.headers.Authorization).toMatch(/^token /);
    expect(call.headers.Authorization).not.toMatch(/^Bearer /);
  });

  it("includes correct User-Agent and editor headers", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    const call = ctx.host.http.request.mock.calls[0][0];
    expect(call.headers["User-Agent"]).toBe("GitHubCopilotChat/0.26.7");
    expect(call.headers["Editor-Version"]).toBe("vscode/1.96.2");
    expect(call.headers["X-Github-Api-Version"]).toBe("2025-04-01");
  });

  it("includes periodDurationMs on paid tier progress lines", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const credits = result.lines.find((l) => l.label === "Credits");
    const chat = result.lines.find((l) => l.label === "Chat");
    expect(credits.periodDurationMs).toBe(30 * 24 * 60 * 60 * 1000);
    expect(chat.periodDurationMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("renders Chat and Completions for free tier (limited_user_quotas)", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        copilot_plan: "individual",
        access_type_sku: "free_limited_copilot",
        limited_user_quotas: { chat: 410, completions: 4000 },
        monthly_quotas: { chat: 500, completions: 4000 },
        limited_user_reset_date: "2026-02-11",
      }),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const chat = result.lines.find((l) => l.label === "Chat");
    const completions = result.lines.find((l) => l.label === "Completions");
    expect(chat).toBeTruthy();
    expect(chat.used).toBe(90);
    expect(chat.limit).toBe(500);
    expect(chat.format).toEqual({ kind: "count", suffix: "/ 500" });
    expect(completions).toBeTruthy();
    expect(completions.used).toBe(0);
    expect(completions.limit).toBe(4000);
    expect(result.lines.find((l) => l.label === "Credits")).toBeFalsy();
  });

  it("includes periodDurationMs on free tier progress lines", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        copilot_plan: "individual",
        limited_user_quotas: { chat: 400, completions: 3000 },
        monthly_quotas: { chat: 500, completions: 4000 },
        limited_user_reset_date: "2026-02-11",
      }),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const chat = result.lines.find((l) => l.label === "Chat");
    const completions = result.lines.find((l) => l.label === "Completions");
    expect(chat.periodDurationMs).toBe(30 * 24 * 60 * 60 * 1000);
    expect(completions.periodDurationMs).toBe(30 * 24 * 60 * 60 * 1000);
  });

  it("propagates resetsAt from limited_user_reset_date for free tier", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        copilot_plan: "individual",
        limited_user_quotas: { chat: 450, completions: 3500 },
        monthly_quotas: { chat: 500, completions: 4000 },
        limited_user_reset_date: "2026-02-11",
      }),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const chat = result.lines.find((l) => l.label === "Chat");
    expect(chat.resetsAt).toBe("2026-02-11T00:00:00.000Z");
  });

  it("handles free tier with partially used quotas", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        copilot_plan: "individual",
        limited_user_quotas: { chat: 250, completions: 2000 },
        monthly_quotas: { chat: 500, completions: 4000 },
        limited_user_reset_date: "2026-02-15",
      }),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const chat = result.lines.find((l) => l.label === "Chat");
    const completions = result.lines.find((l) => l.label === "Completions");
    expect(chat.used).toBe(250);
    expect(chat.limit).toBe(500);
    expect(completions.used).toBe(2000);
    expect(completions.limit).toBe(4000);
  });

  it("handles graceful keychain write failure", async () => {
    const ctx = makePluginTestContext();
    setGhCliKeychain(ctx, "gho_tok");
    mockUsageOk(ctx);
    ctx.host.keychain.writeGenericPassword.mockImplementation(() => {
      throw new Error("keychain locked");
    });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).not.toThrow();
    expect(ctx.host.log.warn).toHaveBeenCalled();
  });

  it("uses gh CLI even when a cached token exists", async () => {
    const ctx = makePluginTestContext();
    ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
      if (service === "Quotracker-copilot") {
        return JSON.stringify({ token: "stale_token" });
      }
      if (service === "gh:github.com") {
        return "fresh_gh_token";
      }
      return null;
    });
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    expect(ctx.host.http.request.mock.calls[0][0].headers.Authorization).toBe(
      "token fresh_gh_token",
    );
  });

  it("throws when stale keychain token and no fallback available", async () => {
    const ctx = makePluginTestContext();
    ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
      if (service === "Quotracker-copilot") {
        return JSON.stringify({ token: "stale_token" });
      }
      return null; // No gh-cli fallback
    });
    ctx.host.http.request.mockReturnValue({ status: 401, bodyText: "" });
    const plugin = await loadPlugin();
    expect(() => plugin.probe(ctx)).toThrow("Token invalid");
  });

  it("falls back when app keychain payload lacks token field", async () => {
    const ctx = makePluginTestContext();
    ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
      if (service === "Quotracker-copilot") return JSON.stringify({ notToken: "x" });
      if (service === "gh:github.com") return "gho_fallback";
      return null;
    });
    mockUsageOk(ctx, makeUsageResponse({ copilot_plan: null }));

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.plan).toBeNull();
    expect(result.lines.find((l) => l.label === "Credits")).toBeTruthy();
  });

  it("returns empty lines when free-tier quotas are present but invalid", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        limited_user_quotas: { chat: 10, completions: "x" },
        monthly_quotas: { chat: 0, completions: 0 },
        limited_user_reset_date: "2026-02-11",
      }),
    });

    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines).toEqual([]);
  });

  it("loads token from editor apps.json before gh CLI", async () => {
    const ctx = makePluginTestContext();
    ctx.host.fs.writeText(
      "~/.config/github-copilot/apps.json",
      JSON.stringify({ "github.com:123": { oauth_token: "ghu_editor" } }),
    );
    setGhCliKeychain(ctx, "gho_ghcli");
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    expect(ctx.host.http.request.mock.calls[0][0].headers.Authorization).toBe(
      "token ghu_editor",
    );
  });

  it("loads token from gh hosts.yml when editor files are missing", async () => {
    const ctx = makePluginTestContext();
    ctx.host.fs.writeText(
      "~/.config/gh/hosts.yml",
      "github.com:\n  oauth_token: gho_yaml\n  user: oikawa\n",
    );
    mockUsageOk(ctx);
    const plugin = await loadPlugin();
    plugin.probe(ctx);
    expect(ctx.host.http.request.mock.calls[0][0].headers.Authorization).toBe(
      "token gho_yaml",
    );
  });

  it("maps paid percent_remaining 70 to Credits used 30", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify(
        makeUsageResponse({
          quota_snapshots: {
            premium_interactions: {
              percent_remaining: 70,
              entitlement: 300,
              remaining: 210,
              quota_id: "premium",
            },
            chat: { unlimited: true, entitlement: -1, remaining: -1 },
          },
        }),
      ),
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    const credits = result.lines.find((l) => l.label === "Credits");
    expect(credits.used).toBe(30);
    expect(credits.limit).toBe(100);
    expect(result.lines.find((l) => l.label === "Chat")).toBeFalsy();
  });

  it("keeps usage meters when org billing lookup fails", async () => {
    const ctx = makePluginTestContext();
    setKeychainToken(ctx, "tok");
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("/user/orgs")) {
        throw new Error("org list failed");
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          copilot_plan: "business",
          token_based_billing: true,
          quota_snapshots: {
            premium_interactions: { entitlement: 0, remaining: 0, credits_used: 12 },
          },
        }),
      };
    });
    const plugin = await loadPlugin();
    const result = plugin.probe(ctx);
    expect(result.lines.find((l) => l.label === "Credits").value).toBe("12");
    expect(result.lines.find((l) => l.label === "Org Credits")).toBeFalsy();
  });
});
