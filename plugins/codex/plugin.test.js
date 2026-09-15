import { beforeEach, describe, expect, it, vi } from "vitest"
import { makeCtx } from "../test-helpers.js"
import pluginManifest from "./plugin.json"

const loadPlugin = async () => {
  await import("./plugin.js")
  return globalThis.__quotracker_plugin
}

describe("codex plugin", () => {
  it("declares Window Starter with first-party default plus OpenCode, Hermes, and Pi", () => {
    expect(pluginManifest.windowStarter).toEqual({
      enabledByDefault: true,
      defaultRunner: "codex",
      allowedRunners: ["codex", "opencode", "hermes", "pi"],
      windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
    })
  })

  beforeEach(() => {
    delete globalThis.__quotracker_plugin
    vi.resetModules()
  })

  it("declares Luna Reserve as an unmarked weekly On Demand line", () => {
    expect(pluginManifest.lines).toEqual(
      expect.arrayContaining([
        { type: "progress", label: "Luna Reserve", scope: "detail" },
      ]),
    )
    const labels = pluginManifest.lines.map((line) => line.label)
    expect(labels).not.toContain("Luna Reserve Wk")
    expect(labels).not.toContain("Spark")
    expect(labels).not.toContain("Spark Wk")
    const reserve = pluginManifest.lines.find((line) => line.label === "Luna Reserve")
    expect(reserve.visibleByDefault).toBeUndefined()
  })

  it("throws when auth missing", async () => {
    const ctx = makeCtx()
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("loads auth from keychain when auth file is missing", async () => {
    const ctx = makeCtx()
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("uses CODEX_HOME auth path when env var is set", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "/tmp/codex-home" : null))
    ctx.host.fs.writeText("/tmp/codex-home/auth.json", JSON.stringify({
      tokens: { access_token: "env-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer env-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("uses ~/.config/codex/auth.json before ~/.codex/auth.json when env is not set", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "legacy-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer config-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("does not fall back when CODEX_HOME is set but missing auth file", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "/tmp/missing-codex-home" : null))
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "legacy-token" },
      last_refresh: new Date().toISOString(),
    }))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("throws when auth json is invalid", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", "{bad")
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("falls back to keychain when auth file is invalid", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", "{bad")
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("supports hex-encoded keychain auth payload", async () => {
    const ctx = makeCtx()
    const raw = JSON.stringify({
      tokens: { access_token: "hex-token" },
      last_refresh: new Date().toISOString(),
    })
    const hex = Buffer.from(raw, "utf8").toString("hex")
    ctx.host.keychain.readGenericPassword.mockReturnValue(hex)
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer hex-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("throws when auth lacks tokens and api key", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({ tokens: {} }))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("refreshes token and formats usage", async () => {
    const ctx = makeCtx()
    const authPath = "~/.codex/auth.json"
    ctx.host.fs.writeText(authPath, JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh", account_id: "acc" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: "new" }) }
      }
      return {
        status: 200,
        headers: {
          "x-codex-primary-used-percent": "25",
          "x-codex-secondary-used-percent": "50",
          "x-codex-credits-balance": "100",
        },
        bodyText: JSON.stringify({
          plan_type: "pro",
          rate_limit: {
            primary_window: { reset_after_seconds: 60, used_percent: 10, limit_window_seconds: 604800 },
            secondary_window: { reset_after_seconds: 120, used_percent: 20, limit_window_seconds: 18000 },
          },
        }),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeTruthy()
    const session = result.lines.find((line) => line.label === "Session")
    expect(session).toBeTruthy()
    expect(session.used).toBe(50)
    expect(session.periodDurationMs).toBe(18000000)
    const weekly = result.lines.find((line) => line.label === "Weekly")
    expect(weekly).toBeTruthy()
    expect(weekly.used).toBe(25) // header percentage preferred over body used_percent
    expect(weekly.periodDurationMs).toBe(604800000)
    const extra = result.lines.find((line) => line.label === "Extra Usage")
    expect(extra).toBeTruthy()
    expect(extra.value).toBe("$4.00 · 100 credits")
    expect(result.lines.find((line) => line.label === "Credits")).toBeUndefined()
    const urls = ctx.host.http.request.mock.calls.map((call) => String(call[0]?.url || ""))
    expect(urls.some((url) => url.includes("consume"))).toBe(false)
  })

  it("refreshes keychain auth and writes back to keychain", async () => {
    const ctx = makeCtx()
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh", account_id: "acc" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: "new" }) }
      }
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(ctx.host.keychain.writeGenericPassword).toHaveBeenCalled()
    const [service, payload] = ctx.host.keychain.writeGenericPassword.mock.calls[0]
    expect(service).toBe("Codex Auth")
    expect(String(payload)).toContain("\"access_token\":\"new\"")
  })

  it("omits token lines when ccusage reports no_runner", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "no_runner" })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Today")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Yesterday")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Last 30 Days")).toBeUndefined()
    // Header-only data with no rate_limit windows: nothing is classifiable, no account line.
    expect(result.lines.find((l) => l.label === "Session")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Weekly")).toBeUndefined()
  })

  it("adds token lines from codex ccusage format and passes codex provider", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-20T16:00:00.000Z"))

    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    const now = new Date()
    const month = now.toLocaleString("en-US", { month: "short" })
    const day = String(now.getDate()).padStart(2, "0")
    const year = now.getFullYear()
    const todayKey = month + " " + day + ", " + year
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: {
        daily: [
        { date: todayKey, totalTokens: 150, costUSD: 0.75 },
        { date: "Feb 01, 2026", totalTokens: 300, costUSD: 1.0 },
        ],
      },
    })

    try {
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)

      const today = result.lines.find((l) => l.label === "Today")
      expect(today).toBeTruthy()
      expect(today.value).toContain("150 tokens")
      expect(today.value).toContain("$0.75")

      const last30 = result.lines.find((l) => l.label === "Last 30 Days")
      expect(last30).toBeTruthy()
      expect(last30.value).toContain("450 tokens")
      expect(last30.value).toContain("$1.75")

      expect(ctx.host.ccusage.query).toHaveBeenCalled()
      const firstCall = ctx.host.ccusage.query.mock.calls[0][0]
      expect(firstCall.provider).toBe("codex")
      const since = new Date()
      since.setDate(since.getDate() - 30)
      const sinceYear = String(since.getFullYear())
      const sinceMonth = String(since.getMonth() + 1).padStart(2, "0")
      const sinceDay = String(since.getDate()).padStart(2, "0")
      expect(firstCall.since).toBe(sinceYear + sinceMonth + sinceDay)
    } finally {
      vi.useRealTimers()
    }
  })

  it("passes CODEX_HOME to ccusage via homePath", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "/tmp/codex-home" : null))
    ctx.host.fs.writeText("/tmp/codex-home/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "ok", data: { daily: [] } })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(ctx.host.ccusage.query).toHaveBeenCalled()
    const firstCall = ctx.host.ccusage.query.mock.calls[0][0]
    expect(firstCall.homePath).toBe("/tmp/codex-home")
  })

  it("queries ccusage on each probe", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: { daily: [{ date: "2026-02-01", totalTokens: 100, totalCost: 0.5 }] },
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
    plugin.probe(ctx)

    expect(ctx.host.ccusage.query).toHaveBeenCalledTimes(2)
  })

  it("shows empty Today state when ccusage returns ok with empty daily array", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "ok", data: { daily: [] } })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const todayLine = result.lines.find((l) => l.label === "Today")
    expect(todayLine).toBeTruthy()
    expect(todayLine.value).toContain("$0.00")
    expect(todayLine.value).toContain("0 tokens")
    const yesterdayLine = result.lines.find((l) => l.label === "Yesterday")
    expect(yesterdayLine).toBeTruthy()
    expect(yesterdayLine.value).toContain("$0.00")
    expect(yesterdayLine.value).toContain("0 tokens")
    expect(result.lines.find((l) => l.label === "Last 30 Days")).toBeUndefined()
  })

  it("shows empty Yesterday state when yesterday's totals are zero (regression)", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const month = yesterday.toLocaleString("en-US", { month: "short" })
    const day = String(yesterday.getDate()).padStart(2, "0")
    const year = yesterday.getFullYear()
    const yesterdayKey = month + " " + day + ", " + year
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: {
        daily: [
        { date: yesterdayKey, totalTokens: 0, costUSD: 0 },
        ],
      },
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const yesterdayLine = result.lines.find((l) => l.label === "Yesterday")
    expect(yesterdayLine).toBeTruthy()
    expect(yesterdayLine.value).toContain("$0.00")
    expect(yesterdayLine.value).toContain("0 tokens")
  })

  it("shows empty Today when history exists but today is missing (regression)", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: {
        daily: [
        { date: "Feb 01, 2026", totalTokens: 300, costUSD: 1.0 },
        ],
      },
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const todayLine = result.lines.find((l) => l.label === "Today")
    expect(todayLine).toBeTruthy()
    expect(todayLine.value).toContain("$0.00")
    expect(todayLine.value).toContain("0 tokens")
    const yesterdayLine = result.lines.find((l) => l.label === "Yesterday")
    expect(yesterdayLine).toBeTruthy()
    expect(yesterdayLine.value).toContain("$0.00")
    expect(yesterdayLine.value).toContain("0 tokens")

    const last30 = result.lines.find((l) => l.label === "Last 30 Days")
    expect(last30).toBeTruthy()
    expect(last30.value).toContain("300 tokens")
    expect(last30.value).toContain("$1.00")
  })

  it("adds Yesterday line from codex ccusage format", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    const month = yesterday.toLocaleString("en-US", { month: "short" })
    const day = String(yesterday.getDate()).padStart(2, "0")
    const year = yesterday.getFullYear()
    const yesterdayKey = month + " " + day + ", " + year
    ctx.host.ccusage.query.mockReturnValue({
      status: "ok",
      data: {
        daily: [
        { date: yesterdayKey, totalTokens: 220, costUSD: 1.1 },
        ],
      },
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const yesterdayLine = result.lines.find((l) => l.label === "Yesterday")
    expect(yesterdayLine).toBeTruthy()
    expect(yesterdayLine.value).toContain("220 tokens")
    expect(yesterdayLine.value).toContain("$1.10")
  })

  it("matches UTC timestamp day keys at month boundary (regression)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0))
    try {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: { daily: [{ date: "2026-03-01T12:00:00Z", totalTokens: 10, costUSD: 0.1 }] },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const todayLine = result.lines.find((line) => line.label === "Today")
      expect(todayLine).toBeTruthy()
      expect(todayLine.value).toContain("10 tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("matches UTC+9 timestamp day keys at month boundary (regression)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0))
    try {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: { daily: [{ date: "2026-03-01T00:30:00+09:00", totalTokens: 20, costUSD: 0.2 }] },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const todayLine = result.lines.find((line) => line.label === "Today")
      expect(todayLine).toBeTruthy()
      expect(todayLine.value).toContain("20 tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("matches UTC-8 timestamp day keys at day boundary (regression)", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(2026, 2, 1, 12, 0, 0))
    try {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: { daily: [{ date: "2026-03-01T23:30:00-08:00", totalTokens: 30, costUSD: 0.3 }] },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const todayLine = result.lines.find((line) => line.label === "Today")
      expect(todayLine).toBeTruthy()
      expect(todayLine.value).toContain("30 tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("throws token expired when refresh fails", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockReturnValue({ status: 401, headers: {}, bodyText: "{}" })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token expired")
  })

  it("throws token conflict when refresh token is reused", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockReturnValue({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_reused" } }),
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token conflict")
  })

  it("throws for api key auth", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      OPENAI_API_KEY: "key",
    }))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage not available for API key")
  })

  it("falls back to rate_limit data and review window", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 10, reset_after_seconds: 60, limit_window_seconds: 604800 },
          secondary_window: { used_percent: 20, reset_after_seconds: 120, limit_window_seconds: 18000 },
        },
        code_review_rate_limit: {
          primary_window: { used_percent: 15, reset_after_seconds: 90 },
        },
        credits: { balance: 500 },
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const session = result.lines.find((line) => line.label === "Session")
    expect(session).toBeTruthy()
    expect(session.used).toBe(20)
    const weekly = result.lines.find((line) => line.label === "Weekly")
    expect(weekly).toBeTruthy()
    expect(weekly.used).toBe(10)
    expect(result.lines.find((line) => line.label === "Reviews")).toBeTruthy()
    const extra = result.lines.find((line) => line.label === "Extra Usage")
    expect(extra).toBeTruthy()
    expect(extra.value).toBe("$20.00 · 500 credits")
    expect(result.lines.find((line) => line.label === "Credits")).toBeUndefined()
  })

  it("omits account rate-limit lines when the window duration is missing", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 10 },
        },
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    // No duration means no classification: no Session fallback and no Weekly guess.
    expect(result.lines.find((line) => line.label === "Session")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Weekly")).toBeUndefined()
  })

  it("uses reset_at when present for resetsAt", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    const resetsAtExpected = new Date((nowSec + 60) * 1000).toISOString()

    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 10, reset_at: nowSec + 60, limit_window_seconds: 604800 },
        },
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const weekly = result.lines.find((line) => line.label === "Weekly")
    expect(weekly).toBeTruthy()
    expect(weekly.resetsAt).toBe(resetsAtExpected)
    expect(weekly.periodDurationMs).toBe(604800000)
    nowSpy.mockRestore()
  })

  it("classifies a weekly-only response as one Weekly line without Session", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    try {
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "30" },
        bodyText: JSON.stringify({
          rate_limit: {
            primary_window: { used_percent: 30, reset_at: nowSec + 3600, limit_window_seconds: 604800 },
          },
        }),
      })
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      expect(result.lines.find((l) => l.label === "Session")).toBeUndefined()
      const weekly = result.lines.find((l) => l.label === "Weekly")
      expect(weekly).toBeTruthy()
      expect(weekly.used).toBe(30)
      expect(weekly.periodDurationMs).toBe(604800000)
      expect(weekly.resetsAt).toBe(new Date((nowSec + 3600) * 1000).toISOString())
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("emits Session from a five-hour primary window and keeps weekly-secondary", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    try {
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({
          rate_limit: {
            primary_window: { used_percent: 70, reset_at: nowSec + 1800, limit_window_seconds: 18000 },
            secondary_window: { used_percent: 25, reset_at: nowSec + 86400, limit_window_seconds: 604800 },
          },
        }),
      })
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const session = result.lines.find((l) => l.label === "Session")
      expect(session).toBeTruthy()
      expect(session.used).toBe(70)
      expect(session.periodDurationMs).toBe(18000000)
      const weeklyLines = result.lines.filter((l) => l.label === "Weekly")
      expect(weeklyLines).toHaveLength(1)
      expect(weeklyLines[0].used).toBe(25)
      expect(weeklyLines[0].periodDurationMs).toBe(604800000)
      expect(weeklyLines[0].resetsAt).toBe(new Date((nowSec + 86400) * 1000).toISOString())
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("emits no account rate-limit line for missing or unknown durations", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const runCase = async (headers, body) => {
      ctx.host.http.request.mockReturnValueOnce({
        status: 200,
        headers,
        bodyText: JSON.stringify(body),
      })
      delete globalThis.__quotracker_plugin
      vi.resetModules()
      const plugin = await loadPlugin()
      return plugin.probe(ctx)
    }

    // Missing duration on both windows.
    const result1 = await runCase({ "x-codex-primary-used-percent": "10" }, {
      rate_limit: {
        primary_window: { used_percent: 10, reset_after_seconds: 60 },
        secondary_window: { used_percent: 20, reset_after_seconds: 120 },
      },
    })
    expect(result1.lines.find((l) => l.label === "Session")).toBeUndefined()
    expect(result1.lines.find((l) => l.label === "Weekly")).toBeUndefined()

    // Unknown duration value (neither 18000 nor 604800).
    const result2 = await runCase({ "x-codex-primary-used-percent": "10" }, {
      rate_limit: {
        primary_window: { used_percent: 10, limit_window_seconds: 9999 },
      },
    })
    expect(result2.lines.find((l) => l.label === "Session")).toBeUndefined()
    expect(result2.lines.find((l) => l.label === "Weekly")).toBeUndefined()

    // Header-only data with no rate_limit windows at all.
    const result3 = await runCase({ "x-codex-primary-used-percent": "10" }, {})
    expect(result3.lines.find((l) => l.label === "Session")).toBeUndefined()
    expect(result3.lines.find((l) => l.label === "Weekly")).toBeUndefined()
  })

  it("collapses duplicate weekly windows into one Weekly line (primary wins)", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    try {
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({
          rate_limit: {
            primary_window: { used_percent: 11, reset_at: nowSec + 1000, limit_window_seconds: 604800 },
            secondary_window: { used_percent: 22, reset_at: nowSec + 2000, limit_window_seconds: 604800 },
          },
        }),
      })
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const weeklyLines = result.lines.filter((l) => l.label === "Weekly")
      expect(weeklyLines).toHaveLength(1)
      expect(weeklyLines[0].used).toBe(11) // primary position wins deterministically
      expect(weeklyLines[0].resetsAt).toBe(new Date((nowSec + 1000) * 1000).toISOString())
      expect(weeklyLines[0].periodDurationMs).toBe(604800000)
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("falls through to a usable secondary weekly when the primary weekly lacks a used value", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    try {
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({
          rate_limit: {
            primary_window: { limit_window_seconds: 604800 }, // weekly duration, no used value
            secondary_window: { used_percent: 33, reset_at: nowSec + 7200, limit_window_seconds: 604800 },
          },
        }),
      })
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const weeklyLines = result.lines.filter((l) => l.label === "Weekly")
      expect(weeklyLines).toHaveLength(1)
      expect(weeklyLines[0].used).toBe(33) // emitted from the usable secondary weekly
      expect(weeklyLines[0].resetsAt).toBe(new Date((nowSec + 7200) * 1000).toISOString())
      expect(weeklyLines[0].periodDurationMs).toBe(604800000)
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("throws on http and parse errors", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValueOnce({ status: 500, headers: {}, bodyText: "" })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("HTTP 500")

    ctx.host.http.request.mockReturnValueOnce({ status: 200, headers: {}, bodyText: "bad" })
    expect(() => plugin.probe(ctx)).toThrow("Usage response invalid")
  })

  it("returns empty lines when no usage data and ccusage failed", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "runner_failed" })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines).toEqual([])
  })

  it("throws on usage request failures", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation(() => {
      throw new Error("boom")
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed")
  })

  it("throws on usage request failure after refresh", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token", refresh_token: "refresh" },
      last_refresh: new Date().toISOString(),
    }))
    let usageCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: "new" }) }
      }
      usageCalls += 1
      if (usageCalls === 1) {
        return { status: 401, headers: {}, bodyText: "" }
      }
      throw new Error("boom")
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed after refresh")
  })

  it("omits retiring Spark additional_rate_limits", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))

    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        additional_rate_limits: [
          {
            limit_name: "GPT-5.3-Codex-Spark",
            metered_feature: "codex_bengalfox",
            rate_limit: {
              primary_window: {
                used_percent: 25,
                limit_window_seconds: 18000,
                reset_after_seconds: 3600,
              },
              secondary_window: {
                used_percent: 40,
                limit_window_seconds: 604800,
                reset_after_seconds: 86400,
              },
            },
          },
        ],
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Spark")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Spark Wk")).toBeUndefined()
  })

  it("maps gpt-reserve additional limits to one weekly Luna Reserve", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)

    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        additional_rate_limits: [
          {
            limit_name: "gpt-reserve",
            metered_feature: "base_model_inference",
            rate_limit: {
              primary_window: {
                used_percent: 0,
                limit_window_seconds: 604800,
                reset_after_seconds: 604800,
                reset_at: nowSec + 86400,
              },
              secondary_window: null,
            },
            normal_model_slug: "gpt-5.6-luna",
          },
        ],
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const reserveLines = result.lines.filter((l) => l.label === "Luna Reserve")
    expect(reserveLines).toHaveLength(1)
    expect(reserveLines[0].used).toBe(0)
    expect(reserveLines[0].periodDurationMs).toBe(604800000)
    expect(reserveLines[0].resetsAt).toBe(new Date((nowSec + 86400) * 1000).toISOString())
    expect(result.lines.find((l) => l.label === "Luna Reserve Wk")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "gpt-reserve")).toBeUndefined()

    nowSpy.mockRestore()
  })

  it("collapses duplicate weekly gpt-reserve windows into one Luna Reserve", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        additional_rate_limits: [
          {
            limit_name: "gpt-reserve",
            metered_feature: "codex_gpt_reserve",
            rate_limit: {
              primary_window: {
                used_percent: 100,
                limit_window_seconds: 604800,
              },
              secondary_window: {
                used_percent: 12,
                limit_window_seconds: 604800,
              },
            },
          },
        ],
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const reserveLines = result.lines.filter((l) => l.label === "Luna Reserve")
    expect(reserveLines).toHaveLength(1)
    expect(reserveLines[0].used).toBe(100)
    expect(result.lines.find((l) => l.label === "Luna Reserve Wk")).toBeUndefined()
  })

  it("ignores a five-hour gpt-reserve window", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        additional_rate_limits: [
          {
            limit_name: "gpt-reserve",
            rate_limit: {
              primary_window: {
                used_percent: 8,
                limit_window_seconds: 18000,
              },
            },
          },
        ],
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Luna Reserve")).toBeUndefined()
  })

  it("maps GPT-Codex-prefixed gpt-reserve names to Luna Reserve", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        additional_rate_limits: [
          {
            limit_name: "GPT-5.4-Codex-gpt-reserve",
            rate_limit: {
              primary_window: {
                used_percent: 8,
                limit_window_seconds: 604800,
                reset_after_seconds: 60,
              },
            },
          },
        ],
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Luna Reserve")?.used).toBe(8)
    expect(result.lines.find((l) => l.label === "gpt-reserve")).toBeUndefined()
  })

  it("handles additional_rate_limits with missing fields and fallback labels", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        additional_rate_limits: [
          // Entry with no limit_name, no limit_window_seconds, no secondary
          {
            limit_name: "",
            rate_limit: {
              primary_window: { used_percent: 10, reset_after_seconds: 60 },
              secondary_window: null,
            },
          },
          // Malformed entry (no rate_limit)
          { limit_name: "Bad" },
          // Null entry
          null,
        ],
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const modelLine = result.lines.find((l) => l.label === "Model")
    expect(modelLine).toBeTruthy()
    expect(modelLine.used).toBe(10)
    expect(modelLine.periodDurationMs).toBe(5 * 60 * 60 * 1000) // fallback PERIOD_SESSION_MS
    // No weekly line for this entry since secondary_window is null
    expect(result.lines.find((l) => l.label === "Model Weekly")).toBeUndefined()
    // Malformed and null entries should be skipped
    expect(result.lines.find((l) => l.label === "Bad")).toBeUndefined()
  })

  it("handles missing or empty additional_rate_limits gracefully", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))

    // Missing field
    ctx.host.http.request.mockReturnValueOnce({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 5, reset_after_seconds: 60 },
        },
      }),
    })
    const plugin = await loadPlugin()
    const result1 = plugin.probe(ctx)
    expect(result1.lines.find((l) => l.label === "Spark")).toBeUndefined()

    // Empty array
    ctx.host.http.request.mockReturnValueOnce({
      status: 200,
      headers: {},
      bodyText: JSON.stringify({
        rate_limit: {
          primary_window: { used_percent: 5, reset_after_seconds: 60 },
        },
        additional_rate_limits: [],
      }),
    })
    const result2 = plugin.probe(ctx)
    expect(result2.lines.find((l) => l.label === "Spark")).toBeUndefined()
  })

  it("throws token expired when refresh retry is unauthorized", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token", refresh_token: "refresh" },
      last_refresh: new Date().toISOString(),
    }))
    let usageCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: "new" }) }
      }
      usageCalls += 1
      if (usageCalls === 1) {
        return { status: 401, headers: {}, bodyText: "" }
      }
      return { status: 403, headers: {}, bodyText: "" }
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token expired")
  })

  it("loads keychain auth when env object is unavailable", async () => {
    const ctx = makeCtx()
    ctx.host.env = null
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({
      tokens: { access_token: "keychain-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer keychain-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("ignores blank CODEX_HOME and uses default auth file paths", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => (name === "CODEX_HOME" ? "   " : null))
    ctx.host.fs.writeText("~/.config/codex/auth.json", JSON.stringify({
      tokens: { access_token: "config-token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockImplementation((opts) => {
      expect(opts.headers.Authorization).toBe("Bearer config-token")
      return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
  })

  it("supports uppercase 0X-prefixed keychain hex payload", async () => {
    const ctx = makeCtx()
    const raw = JSON.stringify({
      tokens: { access_token: "hex-token" },
      last_refresh: new Date().toISOString(),
    })
    const hex = "0X" + Buffer.from(raw, "utf8").toString("hex").toUpperCase()
    ctx.host.keychain.readGenericPassword.mockReturnValue(hex)
    const originalTextDecoder = globalThis.TextDecoder
    // Force fallback decode path used in hosts without TextDecoder.
    globalThis.TextDecoder = undefined
    try {
      ctx.host.http.request.mockImplementation((opts) => {
        expect(opts.headers.Authorization).toBe("Bearer hex-token")
        return { status: 200, headers: {}, bodyText: JSON.stringify({}) }
      })
      const plugin = await loadPlugin()
      plugin.probe(ctx)
    } finally {
      globalThis.TextDecoder = originalTextDecoder
    }
  })

  it("throws token messages for refresh_token_expired and invalidated", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockReturnValueOnce({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_expired" } }),
    })
    let plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Session expired")

    ctx.host.http.request.mockReset()
    ctx.host.http.request.mockReturnValueOnce({
      status: 400,
      headers: {},
      bodyText: JSON.stringify({ error: { code: "refresh_token_invalidated" } }),
    })
    delete globalThis.__quotracker_plugin
    vi.resetModules()
    plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token revoked")
  })

  it("falls back to existing token when refresh cannot produce new access token", async () => {
    const baseAuth = {
      tokens: { access_token: "existing", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }

    const runCase = async (refreshResp) => {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify(baseAuth))
      ctx.host.http.request.mockImplementation((opts) => {
        if (String(opts.url).includes("oauth/token")) return refreshResp
        expect(opts.headers.Authorization).toBe("Bearer existing")
        return {
          status: 200,
          headers: { "x-codex-primary-used-percent": "5" },
          bodyText: JSON.stringify({}),
        }
      })

      delete globalThis.__quotracker_plugin
      vi.resetModules()
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      // Header-only response with no windows: no account rate-limit line is emitted.
      expect(result.lines.find((line) => line.label === "Session")).toBeUndefined()
      expect(result.lines.find((line) => line.label === "Weekly")).toBeUndefined()
    }

    await runCase({ status: 500, headers: {}, bodyText: "" })
    await runCase({ status: 200, headers: {}, bodyText: "not-json" })
    await runCase({ status: 200, headers: {}, bodyText: JSON.stringify({}) })
  })

  it("throws when refresh body is malformed and auth endpoint is unauthorized", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))
    ctx.host.http.request.mockReturnValue({
      status: 401,
      headers: {},
      bodyText: "{bad",
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token expired")
  })

  it("uses no_runner when ccusage host API is unavailable", async () => {
    const ctx = makeCtx()
    ctx.host.ccusage = null
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Today")).toBeUndefined()
  })

  it("handles malformed ccusage result payload as runner_failed", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      headers: { "x-codex-primary-used-percent": "10" },
      bodyText: JSON.stringify({}),
    })
    ctx.host.ccusage.query.mockReturnValue({ status: "ok", data: {} })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Today")).toBeUndefined()
  })

  it("formats large token totals using compact units", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-12-15T12:00:00.000Z"))
    try {
      const ctx = makeCtx()
      ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
        tokens: { access_token: "token" },
        last_refresh: new Date().toISOString(),
      }))
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "10" },
        bodyText: JSON.stringify({}),
      })

      const now = new Date()
      const month = now.toLocaleString("en-US", { month: "short" })
      const day = String(now.getDate()).padStart(2, "0")
      const year = now.getFullYear()
      const todayKey = month + " " + day + ", " + year
      ctx.host.ccusage.query.mockReturnValue({
        status: "ok",
        data: {
          daily: [
            { date: todayKey, totalTokens: 1_250_000, totalCost: 12.5 },
            { date: "20261214", totalTokens: 25_000_000, costUSD: 50.0 },
            { date: "bad-date", totalTokens: "n/a", costUSD: "n/a" },
          ],
        },
      })

      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const today = result.lines.find((line) => line.label === "Today")
      const last30 = result.lines.find((line) => line.label === "Last 30 Days")
      expect(today && today.value).toContain("1.3M tokens")
      expect(last30 && last30.value).toContain("26M tokens")
    } finally {
      vi.useRealTimers()
    }
  })

  it("handles non-string retry wrapper exceptions", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    ctx.util.retryOnceOnAuth = () => {
      throw new Error("boom")
    }

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed. Check your connection.")
  })

  it("treats empty auth file payload as not logged in", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", "")
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("handles missing keychain read API", async () => {
    const ctx = makeCtx()
    ctx.host.keychain = {}
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("ignores keychain payloads that are present but missing token-like auth", async () => {
    const ctx = makeCtx()
    ctx.host.keychain.readGenericPassword.mockReturnValue(JSON.stringify({ user: "me" }))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("stores refresh and id tokens when refresh response includes them", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "old", refresh_token: "refresh" },
      last_refresh: "2000-01-01T00:00:00.000Z",
    }))

    const idToken = "header.payload.signature"
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("oauth/token")) {
        return {
          status: 200,
          headers: {},
          bodyText: JSON.stringify({
            access_token: "new-token",
            refresh_token: "new-refresh",
            id_token: idToken,
          }),
        }
      }
      return {
        status: 200,
        headers: { "x-codex-primary-used-percent": "1" },
        bodyText: JSON.stringify({}),
      }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    const saved = JSON.parse(ctx.host.fs.readText("~/.codex/auth.json"))
    expect(saved.tokens.refresh_token).toBe("new-refresh")
    expect(saved.tokens.id_token).toBe(idToken)
  })

  it("exposes Plus five-hour window as Session before Weekly", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    try {
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: {
          "x-codex-primary-used-percent": "13",
          "x-codex-secondary-used-percent": "42",
        },
        bodyText: JSON.stringify({
          plan_type: "plus",
          rate_limit: {
            primary_window: { used_percent: 12, reset_at: nowSec + 1800, limit_window_seconds: 18000 },
            secondary_window: { used_percent: 34, reset_at: nowSec + 86400, limit_window_seconds: 604800 },
          },
        }),
      })
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const session = result.lines.find((l) => l.label === "Session")
      const weekly = result.lines.find((l) => l.label === "Weekly")
      expect(session).toBeTruthy()
      expect(weekly).toBeTruthy()
      expect(session.used).toBe(13)
      expect(session.periodDurationMs).toBe(18000000)
      expect(session.resetsAt).toBe(new Date((nowSec + 1800) * 1000).toISOString())
      expect(weekly.used).toBe(42)
      expect(weekly.periodDurationMs).toBe(604800000)
      expect(weekly.resetsAt).toBe(new Date((nowSec + 86400) * 1000).toISOString())
      const sessionIdx = result.lines.findIndex((l) => l.label === "Session")
      const weeklyIdx = result.lines.findIndex((l) => l.label === "Weekly")
      expect(sessionIdx).toBeLessThan(weeklyIdx)
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("emits Plus Session before Weekly even when weekly is in primary position", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    try {
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({
          plan_type: "plus",
          rate_limit: {
            primary_window: { used_percent: 55, reset_at: nowSec + 86400, limit_window_seconds: 604800 },
            secondary_window: { used_percent: 77, reset_at: nowSec + 1800, limit_window_seconds: 18000 },
          },
        }),
      })
      const plugin = await loadPlugin()
      const result = plugin.probe(ctx)
      const session = result.lines.find((l) => l.label === "Session")
      const weekly = result.lines.find((l) => l.label === "Weekly")
      expect(session).toBeTruthy()
      expect(weekly).toBeTruthy()
      expect(session.used).toBe(77)
      expect(session.periodDurationMs).toBe(18000000)
      expect(weekly.used).toBe(55)
      expect(weekly.periodDurationMs).toBe(604800000)
      const sessionIdx = result.lines.findIndex((l) => l.label === "Session")
      const weeklyIdx = result.lines.findIndex((l) => l.label === "Weekly")
      expect(sessionIdx).toBeLessThan(weeklyIdx)
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("falls back to body used_percent for Plus Session when headers absent and collapses duplicate Session windows", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    try {
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({
          plan_type: "plus",
          rate_limit: {
            primary_window: { used_percent: 21, reset_after_seconds: 900, limit_window_seconds: 18000 },
            secondary_window: { used_percent: 33, reset_at: nowSec + 86400, limit_window_seconds: 604800 },
          },
        }),
      })
      let plugin = await loadPlugin()
      let result = plugin.probe(ctx)
      let session = result.lines.find((l) => l.label === "Session")
      expect(session).toBeTruthy()
      expect(session.used).toBe(21)
      expect(session.resetsAt).toBe(new Date((nowSec + 900) * 1000).toISOString())
      expect(session.periodDurationMs).toBe(18000000)

      // Duplicate five-hour windows: only one Session line (first emit-capable wins).
      delete globalThis.__quotracker_plugin
      vi.resetModules()
      plugin = await loadPlugin()
      ctx.host.http.request.mockReturnValueOnce({
        status: 200,
        headers: {
          "x-codex-primary-used-percent": "11",
          "x-codex-secondary-used-percent": "22",
        },
        bodyText: JSON.stringify({
          plan_type: "plus",
          rate_limit: {
            primary_window: { used_percent: 99, reset_at: nowSec + 1000, limit_window_seconds: 18000 },
            secondary_window: { used_percent: 88, reset_at: nowSec + 2000, limit_window_seconds: 18000 },
          },
        }),
      })
      result = plugin.probe(ctx)
      const sessionLines = result.lines.filter((l) => l.label === "Session")
      expect(sessionLines).toHaveLength(1)
      expect(sessionLines[0].used).toBe(11)
      expect(sessionLines[0].resetsAt).toBe(new Date((nowSec + 1000) * 1000).toISOString())

      // Fall through when primary Session lacks used value.
      delete globalThis.__quotracker_plugin
      vi.resetModules()
      plugin = await loadPlugin()
      ctx.host.http.request.mockReturnValueOnce({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({
          plan_type: "plus",
          rate_limit: {
            primary_window: { limit_window_seconds: 18000 }, // no used
            secondary_window: { used_percent: 44, reset_at: nowSec + 3000, limit_window_seconds: 18000 },
          },
        }),
      })
      result = plugin.probe(ctx)
      const fallbackSession = result.lines.find((l) => l.label === "Session")
      expect(fallbackSession).toBeTruthy()
      expect(fallbackSession.used).toBe(44)
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("emits five-hour Session for every plan and Rate Limit Resets without a consume request", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    const runCase = async (planType, body) => {
      ctx.host.http.request.mockReturnValueOnce({
        status: 200,
        headers: {},
        bodyText: JSON.stringify(body),
      })
      delete globalThis.__quotracker_plugin
      vi.resetModules()
      const plugin = await loadPlugin()
      return plugin.probe(ctx)
    }
    try {
      const bodies = [
        ["pro", { plan_type: "pro", rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 }, secondary_window: { used_percent: 20, reset_at: nowSec + 86400, limit_window_seconds: 604800 } }, rate_limit_reset_credits: { available_count: 3 } }],
        ["team", { plan_type: "team", rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 }, secondary_window: { used_percent: 20, reset_at: nowSec + 86400, limit_window_seconds: 604800 } } }],
        ["enterprise", { plan_type: "enterprise", rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 } } }],
        ["free", { plan_type: "free", rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 } } }],
        ["Plus", { plan_type: "Plus", rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 }, secondary_window: { used_percent: 20, reset_at: nowSec + 86400, limit_window_seconds: 604800 } } }],
        ["missing", { rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 }, secondary_window: { used_percent: 20, reset_at: nowSec + 86400, limit_window_seconds: 604800 } } }],
        ["null", { plan_type: null, rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 } } }],
        ["unknown", { plan_type: "unknown_plan_xyz", rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 } } }],
      ]
      for (const [label, body] of bodies) {
        const result = await runCase(label, body)
        const session = result.lines.find((l) => l.label === "Session")
        expect(session, `Session should be shown for plan ${label}`).toBeTruthy()
        expect(session.used).toBe(10)
        expect(session.periodDurationMs).toBe(18000000)
        if (body.rate_limit && (body.rate_limit.primary_window?.limit_window_seconds === 604800 || body.rate_limit.secondary_window?.limit_window_seconds === 604800)) {
          const weekly = result.lines.find((l) => l.label === "Weekly")
          expect(weekly, `Weekly should remain for plan ${label}`).toBeTruthy()
          expect(weekly.periodDurationMs).toBe(604800000)
        }
      }
      const withResets = await runCase("pro-resets", {
        plan_type: "pro",
        rate_limit: { primary_window: { used_percent: 10, reset_at: nowSec + 100, limit_window_seconds: 18000 } },
        rate_limit_reset_credits: { available_count: 3 },
      })
      expect(withResets.lines.find((l) => l.label === "Rate Limit Resets").value).toBe("3 available")
      const urls = ctx.host.http.request.mock.calls.map((call) => String(call[0]?.url || ""))
      expect(urls.some((url) => url.includes("consume"))).toBe(false)
    } finally {
      nowSpy.mockRestore()
    }
  })

  it("keeps weekly-only response as one Weekly without Session for Plus and non-Plus", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText("~/.codex/auth.json", JSON.stringify({
      tokens: { access_token: "token" },
      last_refresh: new Date().toISOString(),
    }))
    const now = 1_700_000_000_000
    const nowSpy = vi.spyOn(Date, "now").mockReturnValue(now)
    const nowSec = Math.floor(now / 1000)
    try {
      ctx.host.http.request.mockReturnValue({
        status: 200,
        headers: { "x-codex-primary-used-percent": "30" },
        bodyText: JSON.stringify({
          plan_type: "plus",
          rate_limit: {
            primary_window: { used_percent: 30, reset_at: nowSec + 3600, limit_window_seconds: 604800 },
          },
        }),
      })
      let plugin = await loadPlugin()
      let result = plugin.probe(ctx)
      expect(result.lines.find((l) => l.label === "Session")).toBeUndefined()
      expect(result.lines.filter((l) => l.label === "Weekly")).toHaveLength(1)

      delete globalThis.__quotracker_plugin
      vi.resetModules()
      plugin = await loadPlugin()
      ctx.host.http.request.mockReturnValueOnce({
        status: 200,
        headers: {},
        bodyText: JSON.stringify({
          plan_type: "plus",
          rate_limit: {
            primary_window: { used_percent: 30, reset_at: nowSec + 3600, limit_window_seconds: 604800 },
          },
        }),
      })
      result = plugin.probe(ctx)
      expect(result.lines.find((l) => l.label === "Session")).toBeUndefined()
      expect(result.lines.filter((l) => l.label === "Weekly")).toHaveLength(1)
    } finally {
      nowSpy.mockRestore()
    }
  })
})
