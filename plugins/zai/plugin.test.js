import { beforeEach, describe, expect, it, vi } from "vitest"
import { makeCtx } from "../test-helpers.js"
import pluginManifest from "./plugin.json"

const loadPlugin = async () => {
  await import("./plugin.js")
  return globalThis.__openquotacycle_plugin
}

const mockEnvWithKey = (ctx, key, varName = "ZAI_API_KEY") => {
  ctx.host.env.get.mockImplementation((name) => (name === varName ? key : null))
}

const QUOTA_RESPONSE = {
  code: 200,
  data: {
    limits: [
      {
        type: "TOKENS_LIMIT",
        usage: 800000000,
        currentValue: 1900000,
        percentage: 10,
        nextResetTime: 1738368000000,
        unit: 3,
        number: 5,
      },
      {
        type: "TIME_LIMIT",
        usage: 4000,
        currentValue: 1095,
        percentage: 27,
        remaining: 2905,
        usageDetails: [
          { modelCode: "search-prime", usage: 951 },
          { modelCode: "web-reader", usage: 211 },
          { modelCode: "zread", usage: 0 },
        ],
        unit: 5,
        number: 1,
      },
    ],
  },
}

const QUOTA_RESPONSE_WITH_WEEKLY = {
  code: 200,
  data: {
    limits: [
      {
        type: "TOKENS_LIMIT",
        usage: 800000000,
        currentValue: 1900000,
        percentage: 10,
        nextResetTime: 1738368000000,
        unit: 3,
        number: 5,
      },
      {
        type: "TOKENS_LIMIT",
        usage: 1600000000,
        currentValue: 4800000,
        percentage: 10,
        nextResetTime: 1738972800000,
        unit: 6,
        number: 7,
      },
      {
        type: "TIME_LIMIT",
        usage: 4000,
        currentValue: 1095,
        percentage: 27,
        remaining: 2905,
        usageDetails: [
          { modelCode: "search-prime", usage: 951 },
          { modelCode: "web-reader", usage: 211 },
          { modelCode: "zread", usage: 0 },
        ],
        unit: 5,
        number: 1,
      },
    ],
  },
}

const QUOTA_RESPONSE_NO_TIME_LIMIT = {
  code: 200,
  data: {
    limits: [
      {
        type: "TOKENS_LIMIT",
        usage: 800000000,
        currentValue: 1900000,
        percentage: 10,
        nextResetTime: 1738368000000,
        unit: 3,
        number: 5,
      },
    ],
  },
}

const SUBSCRIPTION_RESPONSE = {
  data: [{ productName: "GLM Coding Max", nextRenewTime: "2026-03-12" }],
}

const mockHttp = (ctx) => {
  ctx.host.http.request.mockImplementation((opts) => {
    if (opts.url.includes("subscription")) {
      return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
    }
    return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE) }
  })
}

const probeAt = async (nowIso) => {
  const ctx = makeCtx()
  ctx.nowIso = nowIso
  mockEnvWithKey(ctx, "test-key")
  mockHttp(ctx)
  const plugin = await loadPlugin()
  return plugin.probe(ctx)
}

describe("zai plugin", () => {
  beforeEach(() => {
    delete globalThis.__openquotacycle_plugin
    vi.resetModules()
  })

  it("declares Window Starter with zcode default and no Claude Code runner", () => {
    expect(pluginManifest.windowStarter).toEqual({
      enabledByDefault: true,
      defaultRunner: "zcode",
      allowedRunners: ["zcode", "opencode", "hermes", "pi"],
      windows: [{ id: "session", line: "Session", weeklyLine: "Weekly" }],
    })
  })

  it("ships plugin metadata with OpenQuota quick links", () => {
    expect(pluginManifest.id).toBe("zai")
    expect(pluginManifest.links).toEqual([
      {
        label: "Dashboard",
        url: "https://z.ai/manage-apikey/coding-plan/personal/my-plan",
      },
      { label: "API Keys", url: "https://z.ai/manage-apikey/apikey-list" },
    ])
  })

  it("throws when no env vars set", async () => {
    const ctx = makeCtx()
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("No ZAI_API_KEY found. Set up environment variable first.")
  })

  it("uses ZAI_API_KEY when set", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    mockHttp(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("falls back to GLM_API_KEY when ZAI_API_KEY is missing", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "glm-key", "GLM_API_KEY")
    mockHttp(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("prefers ZAI_API_KEY over GLM_API_KEY", async () => {
    const ctx = makeCtx()
    ctx.host.env.get.mockImplementation((name) => {
      if (name === "ZAI_API_KEY") return "zai-key"
      if (name === "GLM_API_KEY") return "glm-key"
      return null
    })
    mockHttp(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
    const authHeader = ctx.host.http.request.mock.calls[0][0].headers.Authorization
    expect(authHeader).toBe("Bearer zai-key")
  })

  it("renders session usage as percent from quota response", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    mockHttp(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const line = result.lines.find((l) => l.label === "Session")
    expect(line).toBeTruthy()
    expect(line.type).toBe("progress")
    expect(line.used).toBe(10)
    expect(line.limit).toBe(100)
    expect(line.format).toEqual({ kind: "percent" })
    expect(line.periodDurationMs).toBe(5 * 60 * 60 * 1000)
  })

  it("extracts plan name from subscription response", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    mockHttp(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBe("GLM Coding Max")
  })

  it("handles subscription fetch failure gracefully", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 500, bodyText: "" }
      }
      return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeNull()
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("throws on 401 from quota endpoint", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 401, bodyText: "" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("API key invalid")
  })

  it("throws on HTTP 500 from quota endpoint", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("HTTP 500")
  })

  it("throws on network exception", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      throw new Error("ECONNREFUSED")
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage request failed. Check your connection.")
  })

  it("throws on invalid JSON from quota endpoint", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: "not-json" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage response invalid")
  })

  it("keeps the peak status chip when limits array is empty", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify({ data: { limits: [] } }) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines).toEqual([])
    expect(result.statuses).toEqual([{ text: "Off-Peak", tone: "positive" }])
  })

  it.each([
    ["weekday peak start", "2026-08-24T06:00:00.000Z", "Peak", "danger"],
    ["weekday inside peak window", "2026-08-24T08:30:00.000Z", "Peak", "danger"],
    ["weekday before peak window", "2026-08-24T05:59:59.999Z", "Off-Peak", "positive"],
    ["weekday peak end", "2026-08-28T10:00:00.000Z", "Off-Peak", "positive"],
    ["weekend during peak clock hours", "2026-08-29T07:00:00.000Z", "Off-Peak", "positive"],
  ])("classifies %s", async (_caseName, nowIso, text, tone) => {
    const result = await probeAt(nowIso)
    expect(result.statuses).toEqual([{ text, tone }])
    expect(result.lines.find((l) => l.label === "Peak Hours")).toBeUndefined()
  })

  it("keeps quota metrics unchanged when adding peak status", async () => {
    const result = await probeAt("2026-08-24T08:30:00.000Z")
    expect(result.lines.find((l) => l.label === "Session")).toMatchObject({
      type: "progress",
      used: 10,
      limit: 100,
      resetsAt: new Date(1738368000000).toISOString(),
      periodDurationMs: 5 * 60 * 60 * 1000,
    })
    expect(result.lines.find((l) => l.label === "Tool calls")).toMatchObject({
      type: "progress",
      used: 1095,
      limit: 4000,
      periodDurationMs: 30 * 24 * 60 * 60 * 1000,
    })
  })

  it("passes resetsAt from nextResetTime (epoch ms to ISO)", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    mockHttp(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const line = result.lines.find((l) => l.label === "Session")
    expect(line.resetsAt).toBe(new Date(1738368000000).toISOString())
  })

  it("renders Tool calls line with count format and 1st-of-month reset", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    mockHttp(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const line = result.lines.find((l) => l.label === "Tool calls")
    expect(line).toBeTruthy()
    expect(line.type).toBe("progress")
    expect(line.used).toBe(1095)
    expect(line.limit).toBe(4000)
    expect(line.format).toEqual({ kind: "count", suffix: "/ 4000" })
    expect(line.periodDurationMs).toBe(30 * 24 * 60 * 60 * 1000)
    const now = new Date()
    const expected1st = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    expect(line.resetsAt).toBe(expected1st.toISOString())
  })

  it("skips Tool calls when TIME_LIMIT is absent", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE_NO_TIME_LIMIT) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Tool calls")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("Tool calls still has resetsAt (1st of month) even when subscription fails", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 500, bodyText: "" }
      }
      return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const line = result.lines.find((l) => l.label === "Tool calls")
    expect(line).toBeTruthy()
    const now = new Date()
    const expected1st = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1))
    expect(line.resetsAt).toBe(expected1st.toISOString())
  })

  it("handles missing nextResetTime gracefully", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    const quotaNoReset = {
      data: {
        limits: [
          { type: "TOKENS_LIMIT", percentage: 10, unit: 3, number: 5 },
        ],
      },
    }
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify(quotaNoReset) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const line = result.lines.find((l) => l.label === "Session")
    expect(line).toBeTruthy()
    expect(line.resetsAt).toBeUndefined()
  })

  it("handles invalid subscription JSON without failing quota rendering", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: "not-json" }
      }
      return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeNull()
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("handles subscription payload with empty list", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify({ data: [] }) }
      }
      return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.plan).toBeNull()
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("supports quota payloads where limits are top-level and numeric fields are strings", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return {
        status: 200,
        bodyText: JSON.stringify([
          { type: "TOKENS_LIMIT", percentage: "10", nextResetTime: 1738368000000, unit: 3, number: 5 },
          { type: "TIME_LIMIT", currentValue: "1095", usage: "4000" },
        ]),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Session")).toMatchObject({
      type: "progress",
      used: 10,
      limit: 100,
    })
    expect(result.lines.find((l) => l.label === "Tool calls")).toMatchObject({
      type: "progress",
      used: 1095,
      limit: 4000,
    })
  })

  it("treats a missing percentage as an invalid quota response", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    const quotaMissingPercentage = {
      data: {
        limits: [
          { type: "TOKENS_LIMIT", usage: 800000000, currentValue: 0, nextResetTime: 1738368000000, unit: 3, number: 5 },
          { type: "TIME_LIMIT", currentValue: 1095, usage: 4000, unit: 5 },
        ],
      },
    }
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify(quotaMissingPercentage) }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage response invalid. Try again later.")
  })

  it("treats a missing weekly percentage as an invalid quota response", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    const quotaMissingWeeklyPercentage = {
      code: 200,
      data: {
        limits: [
          {
            type: "TOKENS_LIMIT",
            usage: 800000000,
            currentValue: 1900000,
            percentage: 10,
            nextResetTime: 1738368000000,
            unit: 3,
            number: 5,
          },
          {
            type: "TOKENS_LIMIT",
            usage: 1600000000,
            currentValue: 4800000,
            nextResetTime: 1738972800000,
            unit: 6,
            number: 7,
          },
        ],
      },
    }
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify(quotaMissingWeeklyPercentage) }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Usage response invalid. Try again later.")
  })

  it("keeps valid Session and Weekly displays when percentages are numeric", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE_WITH_WEEKLY) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Session")).toMatchObject({
      type: "progress",
      used: 10,
      limit: 100,
    })
    expect(result.lines.find((l) => l.label === "Weekly")).toMatchObject({
      type: "progress",
      used: 10,
      limit: 100,
    })
  })

  it("keeps Tool calls when only TIME_LIMIT is present", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({ data: { limits: [{ type: "TIME_LIMIT", usage: 10, currentValue: 3 }] } }),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Session")).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Tool calls")).toMatchObject({
      type: "progress",
      used: 3,
      limit: 10,
    })
    expect(result.statuses).toEqual([{ text: "Off-Peak", tone: "positive" }])
  })

  it("maps CREDIT_LIMIT windows to Session and Weekly", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({
          data: {
            limits: [
              { type: "CREDIT_LIMIT", percentage: 12, unit: 3, number: 5, nextResetTime: 1738368000000 },
              { type: "CREDIT_LIMIT", percentage: 40, unit: 6, number: 7, nextResetTime: 1738972800000 },
            ],
          },
        }),
      }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((l) => l.label === "Session")).toMatchObject({
      type: "progress",
      used: 12,
      limit: 100,
      periodDurationMs: 5 * 60 * 60 * 1000,
    })
    expect(result.lines.find((l) => l.label === "Weekly")).toMatchObject({
      type: "progress",
      used: 40,
      limit: 100,
      periodDurationMs: 7 * 7 * 24 * 60 * 60 * 1000,
    })
  })

  it("reports no coding plan when the quota body says the key has none", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return {
        status: 200,
        bodyText: JSON.stringify({ success: false, msg: "No active GLM Coding Plan for this key" }),
      }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow(
      "No active GLM Coding Plan. The API key is valid but has no coding-plan quota.",
    )
  })

  it("renders Weekly line with percent format and payload window duration", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE_WITH_WEEKLY) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const line = result.lines.find((l) => l.label === "Weekly")
    expect(line).toBeTruthy()
    expect(line.type).toBe("progress")
    expect(line.used).toBe(10)
    expect(line.limit).toBe(100)
    expect(line.format).toEqual({ kind: "percent" })
    expect(line.periodDurationMs).toBe(7 * 7 * 24 * 60 * 60 * 1000)
  })

  it("Weekly line has correct percentage, resetsAt, and periodDurationMs values", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify(QUOTA_RESPONSE_WITH_WEEKLY) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const line = result.lines.find((l) => l.label === "Weekly")
    expect(line).toBeTruthy()
    expect(line.resetsAt).toBe(new Date(1738972800000).toISOString())
    expect(line.periodDurationMs).toBe(7 * 7 * 24 * 60 * 60 * 1000)
  })

  it("correctly binds Session to unit 3 and Weekly to unit 6 when weekly appears first", async () => {
    const ctx = makeCtx()
    mockEnvWithKey(ctx, "test-key")
    const quotaReversed = {
      code: 200,
      data: {
        limits: [
          {
            type: "TOKENS_LIMIT",
            usage: 1600000000,
            currentValue: 4800000,
            percentage: 75,
            nextResetTime: 1738972800000,
            unit: 6,
            number: 7,
          },
          {
            type: "TOKENS_LIMIT",
            usage: 800000000,
            currentValue: 1900000,
            percentage: 10,
            nextResetTime: 1738368000000,
            unit: 3,
            number: 5,
          },
          {
            type: "TIME_LIMIT",
            usage: 4000,
            currentValue: 1095,
            percentage: 27,
            remaining: 2905,
            unit: 5,
            number: 1,
          },
        ],
      },
    }
    ctx.host.http.request.mockImplementation((opts) => {
      if (opts.url.includes("subscription")) {
        return { status: 200, bodyText: JSON.stringify(SUBSCRIPTION_RESPONSE) }
      }
      return { status: 200, bodyText: JSON.stringify(quotaReversed) }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const session = result.lines.find((l) => l.label === "Session")
    const weekly = result.lines.find((l) => l.label === "Weekly")
    expect(session).toBeTruthy()
    expect(session.used).toBe(10)
    expect(session.resetsAt).toBe(new Date(1738368000000).toISOString())
    expect(weekly).toBeTruthy()
    expect(weekly.used).toBe(75)
    expect(weekly.resetsAt).toBe(new Date(1738972800000).toISOString())
  })
})
