import { beforeEach, describe, expect, it, vi } from "vitest"
import { makeCtx } from "../test-helpers.js"

const loadPlugin = async () => {
  await import("./plugin.js")
  return globalThis.__openquotacycle_plugin
}

const LINUX_STATE_DB = "~/.config/Cursor/User/globalStorage/state.vscdb"
const MACOS_STATE_DB = "~/Library/Application Support/Cursor/User/globalStorage/state.vscdb"

function makeJwt(payload) {
  const jwtPayload = Buffer.from(JSON.stringify(payload), "utf8")
    .toString("base64")
    .replace(/=+$/g, "")
  return `a.${jwtPayload}.c`
}

describe("cursor plugin", () => {
  beforeEach(() => {
    delete globalThis.__openquotacycle_plugin
    vi.resetModules()
  })

  it("throws when no token", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([]))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in. Sign in via the Cursor app.")
  })

  it("loads tokens from keychain when sqlite has none", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockImplementation((path) => {
      expect(path).toBe(MACOS_STATE_DB)
      return JSON.stringify([])
    })
    ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
      if (service === "cursor-access-token") return "keychain-access-token"
      if (service === "cursor-refresh-token") return "keychain-refresh-token"
      return null
    })
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        enabled: true,
        planUsage: { totalSpend: 1200, limit: 2400 },
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result).toBeTruthy()
    expect(ctx.host.keychain.readGenericPassword).toHaveBeenCalledWith("cursor-access-token")
    expect(ctx.host.keychain.readGenericPassword).toHaveBeenCalledWith("cursor-refresh-token")
  })

  it("loads Cursor Desktop tokens from the Linux state database", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ exp: 9999999999 })
    ctx.app.platform = "linux"
    ctx.host.sqlite.query.mockImplementation((path, sql) => {
      expect(path).toBe(LINUX_STATE_DB)
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([{ value: accessToken }])
      }
      return JSON.stringify([])
    })
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        enabled: true,
        planUsage: { totalSpend: 1200, limit: 2400 },
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result).toBeTruthy()
  })

  it("refreshes keychain access token and persists to keychain source", async () => {
    const ctx = makeCtx()
    const expiredPayload = Buffer.from(JSON.stringify({ exp: 1 }), "utf8")
      .toString("base64")
      .replace(/=+$/g, "")
    const expiredAccessToken = `a.${expiredPayload}.c`
    const freshPayload = Buffer.from(JSON.stringify({ exp: 9999999999 }), "utf8")
      .toString("base64")
      .replace(/=+$/g, "")
    const refreshedAccessToken = `a.${freshPayload}.c`

    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([]))
    ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
      if (service === "cursor-access-token") return expiredAccessToken
      if (service === "cursor-refresh-token") return "keychain-refresh-token"
      return null
    })
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("/oauth/token")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ access_token: refreshedAccessToken }),
        }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          enabled: true,
          planUsage: { totalSpend: 1200, limit: 2400 },
        }),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result).toBeTruthy()
    expect(ctx.host.keychain.writeGenericPassword).toHaveBeenCalledWith(
      "cursor-access-token",
      refreshedAccessToken
    )
    expect(ctx.host.sqlite.exec).not.toHaveBeenCalled()
  })

  it("prefers sqlite tokens when sqlite and keychain both have tokens", async () => {
    const ctx = makeCtx()
    const sqlitePayload = Buffer.from(JSON.stringify({ exp: 9999999999 }), "utf8")
      .toString("base64")
      .replace(/=+$/g, "")
    const sqliteToken = `a.${sqlitePayload}.c`
    const keychainPayload = Buffer.from(JSON.stringify({ exp: 9999999999, sub: "keychain" }), "utf8")
      .toString("base64")
      .replace(/=+$/g, "")
    const keychainToken = `a.${keychainPayload}.c`

    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([{ value: sqliteToken }])
      }
      if (String(sql).includes("cursorAuth/refreshToken")) {
        return JSON.stringify([{ value: "sqlite-refresh-token" }])
      }
      return JSON.stringify([])
    })
    ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
      if (service === "cursor-access-token") return keychainToken
      if (service === "cursor-refresh-token") return "keychain-refresh-token"
      return null
    })
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        expect(opts.headers.Authorization).toBe("Bearer " + sqliteToken)
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          enabled: true,
          planUsage: { totalSpend: 1200, limit: 2400 },
        }),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result).toBeTruthy()
    expect(ctx.host.keychain.readGenericPassword).toHaveBeenCalledWith("cursor-access-token")
    expect(ctx.host.keychain.readGenericPassword).toHaveBeenCalledWith("cursor-refresh-token")
  })

  it("prefers keychain when sqlite looks free and token subjects differ", async () => {
    const ctx = makeCtx()
    const sqlitePayload = Buffer.from(
      JSON.stringify({ exp: 9999999999, sub: "google-oauth2|sqlite-user" }),
      "utf8"
    )
      .toString("base64")
      .replace(/=+$/g, "")
    const sqliteToken = `a.${sqlitePayload}.c`

    const keychainPayload = Buffer.from(
      JSON.stringify({ exp: 9999999999, sub: "auth0|keychain-user" }),
      "utf8"
    )
      .toString("base64")
      .replace(/=+$/g, "")
    const keychainToken = `a.${keychainPayload}.c`

    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([{ value: sqliteToken }])
      }
      if (String(sql).includes("cursorAuth/refreshToken")) {
        return JSON.stringify([{ value: "sqlite-refresh-token" }])
      }
      if (String(sql).includes("cursorAuth/stripeMembershipType")) {
        return JSON.stringify([{ value: "free" }])
      }
      return JSON.stringify([])
    })
    ctx.host.keychain.readGenericPassword.mockImplementation((service) => {
      if (service === "cursor-access-token") return keychainToken
      if (service === "cursor-refresh-token") return "keychain-refresh-token"
      return null
    })
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        expect(opts.headers.Authorization).toBe("Bearer " + keychainToken)
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          enabled: true,
          planUsage: { totalSpend: 1200, limit: 2400 },
        }),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result).toBeTruthy()
  })

  it("throws on sqlite errors when reading token", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockImplementation(() => {
      throw new Error("boom")
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
    expect(ctx.host.log.warn).toHaveBeenCalled()
  })

  it("throws on disabled usage", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({ enabled: false }),
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("No active Cursor subscription.")
  })

  it("throws on missing plan usage data", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({ enabled: true }),
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("No active Cursor subscription.")
  })

  it("accepts team usage when enabled flag is missing", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1770064133000",
            billingCycleEnd: "1772483333000",
            planUsage: {
              totalSpend: 8474,
              limit: 2000,
              bonusSpend: 6474,
              autoPercentUsed: 12.5,
              apiPercentUsed: 7.5,
            },
            spendLimitUsage: {
              pooledLimit: 60000,
              pooledRemaining: 19216,
            },
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ planInfo: { planName: "Team" } }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("Team")
    expect(result.lines.find((line) => line.label === "Total Usage")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Cursor").used).toBe(12.5)
    expect(result.lines.find((line) => line.label === "Other").used).toBe(7.5)
    expect(result.lines.find((line) => line.label === "Bonus spend")).toBeUndefined()
  })

  it("does not require an aggregate limit when pool usage is available", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        enabled: true,
        planUsage: {
          autoPercentUsed: 12.5,
          apiPercentUsed: 7.5,
        }, // aggregate limit is not required for pool metrics
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Cursor").used).toBe(12.5)
    expect(result.lines.find((line) => line.label === "Other").used).toBe(7.5)
    expect(result.lines.find((line) => line.label === "Total Usage")).toBeUndefined()
  })

  it("uses pool percentages when the aggregate limit is missing", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            billingCycleStart: "1772556293029",
            billingCycleEnd: "1775234693029",
            planUsage: {
              autoPercentUsed: 0,
              apiPercentUsed: 0,
              totalPercentUsed: 0,
            },
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Free" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        throw new Error("unexpected REST usage fallback")
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("Free")
    expect(result.lines.find((line) => line.label === "Cursor").used).toBe(0)
    expect(result.lines.find((line) => line.label === "Other").used).toBe(0)
    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(0)
  })

  it("renders pool usage when plan info is unavailable", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            billingCycleStart: "1772556293029",
            billingCycleEnd: "1775234693029",
            planUsage: {
              autoPercentUsed: 42,
              apiPercentUsed: 8,
              totalPercentUsed: 42,
            },
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return { status: 503, bodyText: "" }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        throw new Error("unexpected REST usage fallback")
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeNull()
    expect(result.lines.find((line) => line.label === "Cursor").used).toBe(42)
    expect(result.lines.find((line) => line.label === "Other").used).toBe(8)
    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(42)
  })

  it("does not derive pool usage from spend or aggregate fields", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        enabled: true,
        planUsage: { limit: 2400, remaining: 1200 },
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Cursor")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Other")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Total Usage")).toBeUndefined()
  })

  it("renders usage + plan info", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: {
              totalSpend: 1200,
              limit: 2400,
              bonusSpend: 100,
              autoPercentUsed: 12.5,
              apiPercentUsed: 7.5,
            },
            spendLimitUsage: { individualLimit: 5000, individualRemaining: 1000 },
            billingCycleEnd: Date.now(),
          }),
        }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({ planInfo: { planName: "pro plan" } }),
      }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeTruthy()
    expect(result.lines.find((line) => line.label === "Cursor")).toBeTruthy()
  })

  it("omits plan badge for blank plan names", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { totalSpend: 1200, limit: 2400 },
          }),
        }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({ planInfo: { planName: "   " } }),
      }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeFalsy()
  })

  it("uses pooled spend limits when individual values missing", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { totalSpend: 1200, limit: 2400 },
            spendLimitUsage: { pooledLimit: 2000, pooledRemaining: 500 },
          }),
        }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({ planInfo: { planName: "pro plan" } }),
      }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "On-demand")).toBeTruthy()
  })

  it("throws on token expired", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({ status: 401, bodyText: "" })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token expired")
  })

  it("throws on http errors", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({ status: 500, bodyText: "" })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("HTTP 500")
  })

  it("throws on usage request errors", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation(() => {
      throw new Error("boom")
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed")
  })

  it("throws on parse errors", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: "not-json",
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage response invalid")
  })

  it("handles enterprise account with request-based usage", async () => {
    const ctx = makeCtx()

    // Build a JWT with a sub claim containing a user ID
    const jwtPayload = Buffer.from(
      JSON.stringify({ sub: "google-oauth2|user_abc123", exp: 9999999999 }),
      "utf8"
    )
      .toString("base64")
      .replace(/=+$/g, "")
    const accessToken = `a.${jwtPayload}.c`

    ctx.host.sqlite.query.mockReturnValue(
      JSON.stringify([{ value: accessToken }])
    )
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        // Enterprise returns no enabled/planUsage
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1770539602363",
            billingCycleEnd: "1770539602363",
            displayThreshold: 100,
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Enterprise", price: "Custom" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            "gpt-4": {
              numRequests: 422,
              numRequestsTotal: 422,
              numTokens: 171664819,
              maxRequestUsage: 500,
              maxTokenUsage: null,
            },
            startOfMonth: "2026-02-01T06:12:57.000Z",
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("Enterprise")
    const reqLine = result.lines.find((l) => l.label === "Requests")
    expect(reqLine).toBeTruthy()
    expect(reqLine.used).toBe(422)
    expect(reqLine.limit).toBe(500)
    expect(reqLine.format).toEqual({ kind: "count", suffix: "requests" })
  })

  it("emits Total Usage for enterprise when planUsage has percent but no dollar limit", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })

    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            billingCycleStart: "1770539602363",
            billingCycleEnd: "1770539602363",
            planUsage: {
              totalSpend: 1234,
              totalPercentUsed: 12,
            },
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Enterprise" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        throw new Error("unexpected REST usage fallback")
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("Enterprise")
    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(12)
    expect(result.lines.find((line) => line.label === "Requests")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Cursor")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Other")).toBeUndefined()
  })

  it("emits Total Usage from aggregate percent without inventing pool metrics", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })

    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            billingCycleStart: "1772556293029",
            billingCycleEnd: "1775234693029",
            planUsage: {
              totalPercentUsed: 35,
            },
            spendLimitUsage: {
              limitType: "team",
              pooledLimit: 5000,
            },
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return { status: 503, bodyText: "" }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        throw new Error("unexpected REST usage fallback")
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(35)
    expect(result.lines.find((line) => line.label === "Cursor")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Other")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Requests")).toBeUndefined()
  })

  it("handles team account with request-based usage", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })

    ctx.host.sqlite.query.mockReturnValue(
      JSON.stringify([{ value: accessToken }])
    )
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1772124774973",
            billingCycleEnd: "1772124774973",
            displayThreshold: 100,
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: {
              planName: "Team",
              includedAmountCents: 2000,
              price: "$40/mo",
              billingCycleEnd: "1773077797000",
            },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            "gpt-4": {
              numRequests: 39,
              numRequestsTotal: 39,
              numTokens: 12345,
              maxRequestUsage: 500,
              maxTokenUsage: null,
            },
            startOfMonth: "2026-02-09T17:36:37.000Z",
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("Team")
    const reqLine = result.lines.find((l) => l.label === "Requests")
    expect(reqLine).toBeTruthy()
    expect(reqLine.used).toBe(39)
    expect(reqLine.limit).toBe(500)
    expect(reqLine.format).toEqual({ kind: "count", suffix: "requests" })
  })

  it("throws when enterprise REST usage API fails", async () => {
    const ctx = makeCtx()

    const jwtPayload = Buffer.from(
      JSON.stringify({ sub: "google-oauth2|user_abc123", exp: 9999999999 }),
      "utf8"
    )
      .toString("base64")
      .replace(/=+$/g, "")
    const accessToken = `a.${jwtPayload}.c`

    ctx.host.sqlite.query.mockReturnValue(
      JSON.stringify([{ value: accessToken }])
    )
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1770539602363",
            billingCycleEnd: "1770539602363",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Enterprise" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return { status: 500, bodyText: "" }
      }
      return { status: 200, bodyText: "{}" }
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Enterprise usage data unavailable")
  })

  it("throws team request-based unavailable when REST usage API fails", async () => {
    const ctx = makeCtx()

    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })

    ctx.host.sqlite.query.mockReturnValue(
      JSON.stringify([{ value: accessToken }])
    )
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1772124774973",
            billingCycleEnd: "1772124774973",
            displayThreshold: 100,
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Team" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return { status: 500, bodyText: "" }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Team request-based usage data unavailable")
  })

  it("throws team request-based unavailable when REST usage request throws", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })

    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1772124774973",
            billingCycleEnd: "1772124774973",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ planInfo: { planName: "Team" } }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        throw new Error("rest usage boom")
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Team request-based usage data unavailable")
  })

  it("falls back to REST request usage when plan info is unavailable", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })

    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1772124774973",
            billingCycleEnd: "1772124774973",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return { status: 503, bodyText: "" }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            "gpt-4": {
              numRequests: 31,
              maxRequestUsage: 500,
            },
            startOfMonth: "2026-02-09T17:36:37.000Z",
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeNull()
    const reqLine = result.lines.find((l) => l.label === "Requests")
    expect(reqLine).toBeTruthy()
    expect(reqLine.used).toBe(31)
    expect(reqLine.limit).toBe(500)
  })

  it("surfaces request-based unavailable when plan info is unavailable and REST fallback fails", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })

    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1772124774973",
            billingCycleEnd: "1772124774973",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        throw new Error("plan info timeout")
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return { status: 500, bodyText: "" }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Cursor request-based usage data unavailable")
  })

  it("does not use request-based fallback for disabled team accounts", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })
    let restUsageCalled = false

    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: false,
            billingCycleStart: "1772124774973",
            billingCycleEnd: "1772124774973",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ planInfo: { planName: "Team" } }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        restUsageCalled = true
        return {
          status: 200,
          bodyText: JSON.stringify({
            "gpt-4": { numRequests: 1, maxRequestUsage: 500 },
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("No active Cursor subscription.")
    expect(restUsageCalled).toBe(false)
  })

  it("still throws no subscription for non-enterprise accounts without planUsage", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ enabled: false }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ planInfo: { planName: "Pro" } }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("No active Cursor subscription.")
  })

  it("handles plan fetch failure gracefully", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { totalSpend: 0, limit: 100, autoPercentUsed: 0 },
          }),
        }
      }
      // Plan fetch fails
      throw new Error("plan fail")
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Cursor")).toBeTruthy()
  })

  it("outputs Credits first when available", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: {
              totalSpend: 1200,
              limit: 2400,
              autoPercentUsed: 12.5,
              apiPercentUsed: 7.5,
            },
            spendLimitUsage: { individualLimit: 5000, individualRemaining: 1000 },
          }),
        }
      }
      if (String(opts.url).includes("GetCreditGrantsBalance")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            hasCreditGrants: true,
            totalCents: 10000,
            usedCents: 500,
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    
    // Credits should be first in the lines array
    expect(result.lines[0].label).toBe("Credits")
    expect(result.lines[1].label).toBe("Cursor")
    // On-demand should come after
    const onDemandIndex = result.lines.findIndex((l) => l.label === "On-demand")
    expect(onDemandIndex).toBeGreaterThan(1)
  })

  it("combines credit grants with Stripe customer balance for Credits line", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { totalSpend: 1200, limit: 2400 },
          }),
        }
      }
      if (url.includes("GetCreditGrantsBalance")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            hasCreditGrants: true,
            totalCents: "1000000",
            usedCents: "264729",
          }),
        }
      }
      if (url.includes("/api/auth/stripe")) {
        expect(opts.headers.Cookie).toBe(
          "WorkosCursorSessionToken=user_abc123%3A%3A" + accessToken
        )
        return {
          status: 200,
          bodyText: JSON.stringify({
            customerBalance: -991544,
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const creditsLine = result.lines.find((line) => line.label === "Credits")

    expect(creditsLine).toBeTruthy()
    expect(creditsLine.used).toBeCloseTo(2647.29, 2)
    expect(creditsLine.limit).toBeCloseTo(19915.44, 2)
  })

  it("shows Credits line from Stripe balance when grants are unavailable", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { totalSpend: 1200, limit: 2400 },
          }),
        }
      }
      if (url.includes("GetCreditGrantsBalance")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ hasCreditGrants: false }),
        }
      }
      if (url.includes("/api/auth/stripe")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            customerBalance: -50000,
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const creditsLine = result.lines.find((line) => line.label === "Credits")

    expect(result.lines[0].label).toBe("Credits")
    expect(creditsLine).toBeTruthy()
    expect(creditsLine.used).toBe(0)
    expect(creditsLine.limit).toBe(500)
  })

  it("accepts Stripe customer balance when returned as numeric string", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { totalSpend: 1200, limit: 2400 },
          }),
        }
      }
      if (url.includes("GetCreditGrantsBalance")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ hasCreditGrants: false }),
        }
      }
      if (url.includes("/api/auth/stripe")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            customerBalance: "-50000",
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const creditsLine = result.lines.find((line) => line.label === "Credits")

    expect(result.lines[0].label).toBe("Credits")
    expect(creditsLine).toBeTruthy()
    expect(creditsLine.used).toBe(0)
    expect(creditsLine.limit).toBe(500)
  })

  it("outputs Cursor first when Credits not available", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: {
              totalSpend: 1200,
              limit: 2400,
              autoPercentUsed: 12.5,
              apiPercentUsed: 7.5,
            },
          }),
        }
      }
      if (String(opts.url).includes("GetCreditGrantsBalance")) {
        return {
          status: 200,
          bodyText: JSON.stringify({ hasCreditGrants: false }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    
    // Cursor should be first when Credits are not available.
    expect(result.lines[0].label).toBe("Cursor")
  })

  it("emits monthly Cursor and Other percent lines when available", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            billingCycleStart: "1772556293029",
            billingCycleEnd: "1775234693029",
            planUsage: {
              limit: 40000,
              remaining: 32000,
              totalPercentUsed: 20,
              autoPercentUsed: 12.5,
              apiPercentUsed: 7.5,
            },
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const cursorModelsLine = result.lines.find((line) => line.label === "Cursor")
    const otherModelsLine = result.lines.find((line) => line.label === "Other")

    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(20)
    expect(cursorModelsLine).toBeTruthy()
    expect(cursorModelsLine.used).toBe(12.5)
    expect(cursorModelsLine.limit).toBe(100)
    expect(cursorModelsLine.format).toEqual({ kind: "percent" })
    expect(cursorModelsLine.resetsAt).toBe(new Date(1775234693029).toISOString())
    expect(cursorModelsLine.periodDurationMs).toBe(2678400000)
    expect(otherModelsLine).toBeTruthy()
    expect(otherModelsLine.used).toBe(7.5)
    expect(otherModelsLine.limit).toBe(100)
    expect(otherModelsLine.format).toEqual({ kind: "percent" })
    expect(otherModelsLine.resetsAt).toBe(new Date(1775234693029).toISOString())
    expect(otherModelsLine.periodDurationMs).toBe(2678400000)
  })

  it("does not derive pool usage when the aggregate percentage is not finite", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        enabled: true,
        planUsage: { limit: 2400, remaining: 1200, totalPercentUsed: Number.POSITIVE_INFINITY },
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Total Usage")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Cursor")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Other")).toBeUndefined()
  })

  it("omits both pool metrics when percent fields are missing", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        enabled: true,
        planUsage: { limit: 40000, remaining: 32000, totalPercentUsed: 20 },
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(20)
    expect(result.lines.find((line) => line.label === "Cursor")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Other")).toBeUndefined()
  })

  it("omits only the pool whose percentage is missing", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        enabled: true,
        billingCycleStart: "1772556293029",
        billingCycleEnd: "1775234693029",
        planUsage: { autoPercentUsed: 12.5 },
      }),
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.lines.find((line) => line.label === "Cursor").used).toBe(12.5)
    expect(result.lines.find((line) => line.label === "Other")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Total Usage")).toBeUndefined()
  })

  it("team account uses monthly pool percentages instead of an aggregate dollar line", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: {
              totalSpend: 1200,
              limit: 2400,
              autoPercentUsed: 12.5,
              apiPercentUsed: 7.5,
            },
            spendLimitUsage: { limitType: "team", pooledLimit: 5000, pooledRemaining: 3000 },
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Total Usage")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Cursor").used).toBe(12.5)
    expect(result.lines.find((line) => line.label === "Other").used).toBe(7.5)
  })

  it("refreshes token when expired and persists new access token", async () => {
    const ctx = makeCtx()
    ctx.app.platform = "linux"

    const expiredPayload = Buffer.from(JSON.stringify({ exp: 1 }), "utf8")
      .toString("base64")
      .replace(/=+$/g, "")
    const accessToken = `a.${expiredPayload}.c`

    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([{ value: accessToken }])
      }
      if (String(sql).includes("cursorAuth/refreshToken")) {
        return JSON.stringify([{ value: "refresh" }])
      }
      return JSON.stringify([])
    })

    const newPayload = Buffer.from(JSON.stringify({ exp: 9999999999 }), "utf8")
      .toString("base64")
      .replace(/=+$/g, "")
    const newToken = `a.${newPayload}.c`

    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("/oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: newToken }) }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          enabled: true,
          planUsage: { totalSpend: 0, limit: 100, autoPercentUsed: 0, apiPercentUsed: 0 },
        }),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Cursor")).toBeTruthy()
    expect(ctx.host.sqlite.exec).toHaveBeenCalledWith(LINUX_STATE_DB, expect.any(String))
  })

  it("throws session expired when refresh requires logout and no access token exists", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([])
      }
      if (String(sql).includes("cursorAuth/refreshToken")) {
        return JSON.stringify([{ value: "refresh" }])
      }
      return JSON.stringify([])
    })
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("/oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ shouldLogout: true }) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Session expired")
  })

  it("continues with existing access token when refresh fails", async () => {
    const ctx = makeCtx()

    const payload = Buffer.from(JSON.stringify({ exp: 1 }), "utf8")
      .toString("base64")
      .replace(/=+$/g, "")
    const accessToken = `a.${payload}.c`

    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([{ value: accessToken }])
      }
      if (String(sql).includes("cursorAuth/refreshToken")) {
        return JSON.stringify([{ value: "refresh" }])
      }
      return JSON.stringify([])
    })

    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("/oauth/token")) {
        // Force refresh to throw string error.
        return { status: 401, bodyText: JSON.stringify({ shouldLogout: true }) }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({ enabled: true, planUsage: { totalSpend: 0, limit: 100 } }),
      }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).not.toThrow()
  })

  it("handles invalid sqlite JSON for access token when refresh token is available", async () => {
    const ctx = makeCtx()
    const refreshedToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })

    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) return "{}"
      if (String(sql).includes("cursorAuth/refreshToken")) return JSON.stringify([{ value: "refresh" }])
      return JSON.stringify([])
    })
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("/oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: refreshedToken }) }
      }
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return { status: 200, bodyText: JSON.stringify({ enabled: true, planUsage: { totalSpend: 0, limit: 100 } }) }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result).toBeTruthy()
  })

  it("throws not logged in when only refresh token exists but refresh returns no access token", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) return JSON.stringify([])
      if (String(sql).includes("cursorAuth/refreshToken")) return JSON.stringify([{ value: "refresh" }])
      return JSON.stringify([])
    })
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("/oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({}) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Not logged in")
  })

  it("throws token expired when usage remains unauthorized after refresh retry", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([{ value: makeJwt({ sub: "google-oauth2|u", exp: 9999999999 }) }])
      }
      if (String(sql).includes("cursorAuth/refreshToken")) return JSON.stringify([{ value: "refresh" }])
      return JSON.stringify([])
    })

    let usageCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        usageCalls += 1
        if (usageCalls === 1) return { status: 401, bodyText: "" }
        return { status: 403, bodyText: "" }
      }
      if (String(opts.url).includes("/oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: makeJwt({ sub: "google-oauth2|u", exp: 9999999999 }) }) }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Token expired")
  })

  it("throws usage request failed after refresh when retried usage request errors", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([{ value: makeJwt({ sub: "google-oauth2|u", exp: 9999999999 }) }])
      }
      if (String(sql).includes("cursorAuth/refreshToken")) return JSON.stringify([{ value: "refresh" }])
      return JSON.stringify([])
    })

    let usageCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        usageCalls += 1
        if (usageCalls === 1) return { status: 401, bodyText: "" }
        throw new Error("boom")
      }
      if (String(opts.url).includes("/oauth/token")) {
        return { status: 200, bodyText: JSON.stringify({ access_token: makeJwt({ sub: "google-oauth2|u", exp: 9999999999 }) }) }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed after refresh")
  })

  it("throws enterprise unavailable when token payload has no sub", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return { status: 200, bodyText: JSON.stringify({ billingCycleStart: "1770539602363" }) }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return { status: 200, bodyText: JSON.stringify({ planInfo: { planName: "Enterprise" } }) }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Enterprise usage data unavailable")
  })

  it("supports enterprise JWT sub values without provider prefix", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "user_abc123", exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1770539602363",
            billingCycleEnd: "1770539602363",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Enterprise" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            "gpt-4": {
              numRequests: 3,
              maxRequestUsage: 10,
            },
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("Enterprise")
    const reqLine = result.lines.find((l) => l.label === "Requests")
    expect(reqLine).toBeTruthy()
    expect(reqLine.used).toBe(3)
    expect(reqLine.limit).toBe(10)
  })

  it("omits pool metrics when pool percentages are missing and omits zero on-demand limits", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { limit: 2400 },
            spendLimitUsage: {},
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Total Usage")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Cursor")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Other")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "On-demand")).toBeUndefined()
  })

  it("rethrows string errors from retry wrapper", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.util.retryOnceOnAuth = vi.fn(() => {
      throw "retry failed"
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("retry failed")
  })

  it("skips malformed credit grants payload and still returns pool usage", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { totalSpend: 1200, limit: 2400, autoPercentUsed: 12.5 },
          }),
        }
      }
      if (String(opts.url).includes("GetCreditGrantsBalance")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            hasCreditGrants: true,
            totalCents: "oops",
            usedCents: "10",
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Credits")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Cursor")).toBeTruthy()
    expect(result.lines.find((line) => line.label === "Total Usage")).toBeUndefined()
  })

  it("uses expired access token when refresh token is missing", async () => {
    const ctx = makeCtx()
    const expiredToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 1 })
    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("cursorAuth/accessToken")) {
        return JSON.stringify([{ value: expiredToken }])
      }
      if (String(sql).includes("cursorAuth/refreshToken")) return JSON.stringify([])
      return JSON.stringify([])
    })
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            enabled: true,
            planUsage: { totalSpend: 0, limit: 100 },
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).not.toThrow()
  })

  it("throws enterprise unavailable when sub resolves to empty user id", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|", exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return { status: 200, bodyText: JSON.stringify({ billingCycleStart: "1770539602363" }) }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return { status: 200, bodyText: JSON.stringify({ planInfo: { planName: "Enterprise" } }) }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Enterprise usage data unavailable")
  })

  it("uses zero included requests when enterprise usage omits numRequests", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1770539602363",
            billingCycleEnd: "1770539602363",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Enterprise" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            "gpt-4": {
              maxRequestUsage: 10,
            },
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const reqLine = result.lines.find((line) => line.label === "Requests")
    expect(reqLine).toBeTruthy()
    expect(reqLine.used).toBe(0)
    expect(reqLine.limit).toBe(10)
  })

  it("throws enterprise unavailable when gpt-4 request limit is not positive", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1770539602363",
            billingCycleEnd: "1770539602363",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Enterprise" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            "gpt-4": {
              numRequests: 42,
              maxRequestUsage: 0,
            },
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Enterprise usage data unavailable")
  })

  it("omits enterprise plan label when formatter returns null", async () => {
    const ctx = makeCtx()
    const accessToken = makeJwt({ sub: "google-oauth2|user_abc123", exp: 9999999999 })
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: accessToken }]))
    ctx.fmt.planLabel = vi.fn(() => null)
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetCurrentPeriodUsage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            billingCycleStart: "1770539602363",
            billingCycleEnd: "1770539602363",
          }),
        }
      }
      if (String(opts.url).includes("GetPlanInfo")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            planInfo: { planName: "Enterprise" },
          }),
        }
      }
      if (String(opts.url).includes("cursor.com/api/usage")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            "gpt-4": {
              numRequests: 3,
              maxRequestUsage: 10,
            },
          }),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeNull()
    expect(result.lines.find((line) => line.label === "Requests")).toBeTruthy()
  })

  it("wraps non-string retry wrapper errors as usage request failure", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.util.retryOnceOnAuth = vi.fn(() => {
      throw new Error("wrapper blew up")
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed. Check your connection.")
  })

  it("emits Total Usage from aggregate percent without summing pools", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockReturnValue({
      status: 200,
      bodyText: JSON.stringify({
        enabled: true,
        planUsage: {
          totalPercentUsed: 33,
          autoPercentUsed: 10,
          apiPercentUsed: 40,
        },
      }),
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(33)
    expect(result.lines.find((line) => line.label === "Cursor").used).toBe(10)
    expect(result.lines.find((line) => line.label === "Other").used).toBe(40)
  })

  it("keeps quota meters when optional Grok Bot request fails", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetSandUsageStatus")) {
        throw new Error("grok bot down")
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          enabled: true,
          planUsage: { totalPercentUsed: 12, autoPercentUsed: 12 },
        }),
      }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(12)
    expect(result.lines.find((line) => line.label === "Grok Bot")).toBeUndefined()
    expect(ctx.host.log.warn).toHaveBeenCalled()
  })

  it("omits Grok Bot when the included limit is zero", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetSandUsageStatus")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            usagePercent: 40,
            hasNonZeroIncludedLimit: false,
          }),
        }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          enabled: true,
          planUsage: { autoPercentUsed: 5 },
        }),
      }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Grok Bot")).toBeUndefined()
    expect(result.lines.find((line) => line.label === "Cursor").used).toBe(5)
  })

  it("emits Grok Bot when weekly usage percent is present", async () => {
    const ctx = makeCtx()
    ctx.host.sqlite.query.mockReturnValue(JSON.stringify([{ value: "token" }]))
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetSandUsageStatus")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            usagePercent: 18,
            nextResetTimestampUtc: "2026-03-10T00:00:00.000Z",
          }),
        }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          enabled: true,
          planUsage: { totalPercentUsed: 12 },
        }),
      }
    })
    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Total Usage").used).toBe(12)
    expect(result.lines.find((line) => line.label === "Grok Bot")).toMatchObject({
      type: "progress",
      used: 18,
      limit: 100,
      resetsAt: "2026-03-10T00:00:00.000Z",
    })
  })
})
