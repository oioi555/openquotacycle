import { beforeEach, describe, expect, it, vi } from "vitest"
import { makeCtx as makeBaseCtx } from "../test-helpers.js"
import pluginManifest from "./plugin.json"

function makeCtx() {
  const ctx = makeBaseCtx()
  ctx.app.platform = "linux"
  return ctx
}

const loadPlugin = async () => {
  await import("./plugin.js")
  return globalThis.__quotracker_plugin
}

// --- Fixtures ---

function makeDiscovery(overrides) {
  return Object.assign(
    { pid: 12345, csrf: "test-csrf-token", ports: [42001, 42002], extensionPort: null },
    overrides
  )
}

function makeUserStatusResponse(overrides) {
  var base = {
    userStatus: {
      planStatus: {
        planInfo: {
          planName: "Pro",
          monthlyPromptCredits: 50000,
          monthlyFlowCredits: 150000,
          monthlyFlexCreditPurchaseAmount: 25000,
        },
        availablePromptCredits: 500,
        availableFlowCredits: 100,
        usedFlexCredits: 5000,
      },
      cascadeModelConfigData: {
        clientModelConfigs: [
          {
            label: "Gemini 3.1 Pro (High)",
            modelOrAlias: { model: "MODEL_PLACEHOLDER_M37" },
            quotaInfo: { remainingFraction: 0.8, resetTime: "2026-02-08T09:10:56Z" },
          },
          {
            label: "Gemini 3.1 Pro (Low)",
            modelOrAlias: { model: "MODEL_PLACEHOLDER_M36" },
            quotaInfo: { remainingFraction: 0.8, resetTime: "2026-02-08T09:10:56Z" },
          },
          {
            label: "Gemini 3 Flash",
            modelOrAlias: { model: "MODEL_PLACEHOLDER_M18" },
            quotaInfo: { remainingFraction: 1.0, resetTime: "2026-02-08T09:10:56Z" },
          },
          {
            label: "Claude Sonnet 4.6 (Thinking)",
            modelOrAlias: { model: "MODEL_PLACEHOLDER_M35" },
            quotaInfo: { resetTime: "2026-02-26T15:23:41Z" },
          },
          {
            label: "Claude Opus 4.6 (Thinking)",
            modelOrAlias: { model: "MODEL_PLACEHOLDER_M26" },
            quotaInfo: { resetTime: "2026-02-26T15:23:41Z" },
          },
          {
            label: "GPT-OSS 120B (Medium)",
            modelOrAlias: { model: "MODEL_OPENAI_GPT_OSS_120B_MEDIUM" },
            quotaInfo: { resetTime: "2026-02-26T15:23:41Z" },
          },
        ],
      },
    },
  }
  if (overrides) {
    if (overrides.planName !== undefined) base.userStatus.planStatus.planInfo.planName = overrides.planName
    if (overrides.configs !== undefined) base.userStatus.cascadeModelConfigData.clientModelConfigs = overrides.configs
    if (overrides.planStatus !== undefined) base.userStatus.planStatus = overrides.planStatus
    if (overrides.userTier !== undefined) base.userStatus.userTier = overrides.userTier
  }
  return base
}

function makeCloudCodeResponse(overrides) {
  return Object.assign(
    {
      models: {
        "gemini-3-pro": {
          displayName: "Gemini 3 Pro",
          model: "gemini-3-pro",
          quotaInfo: { remainingFraction: 0.8, resetTime: "2026-02-08T10:00:00Z" },
        },
        "claude-sonnet-4.5": {
          displayName: "Claude Sonnet 4.5",
          model: "claude-sonnet-4.5",
          quotaInfo: { remainingFraction: 0.6, resetTime: "2026-02-08T10:00:00Z" },
        },
      },
    },
    overrides
  )
}

function makeQuotaSummaryResponse(wrapped) {
  const summary = {
    groups: [
      {
        displayName: "Claude and other models",
        buckets: [
          { bucketId: "3p-weekly", remainingFraction: 1, resetTime: "2026-07-06T07:00:00Z" },
          { bucketId: "3p-5h", remainingFraction: 0.4, resetTime: "2026-07-02T15:30:00Z" },
        ],
      },
      {
        displayName: "Gemini models",
        buckets: [
          { bucketId: "gemini-5h", remainingFraction: 0.75, resetTime: "2026-07-02T16:00:00Z" },
          { bucketId: "gemini-weekly", remainingFraction: 0.9, resetTime: "2026-07-06T07:00:00Z" },
        ],
      },
    ],
  }
  return wrapped ? { response: summary } : summary
}

function makeAuthStatusJson(overrides) {
  return JSON.stringify(
    Object.assign({ apiKey: "test-api-key-123", email: "user@example.com", name: "Test User" }, overrides)
  )
}

function setupLsMock(ctx, discovery, responseBody) {
  ctx.host.ls.discover.mockReturnValue(discovery)
  ctx.host.http.request.mockImplementation((opts) => {
    if (String(opts.url).includes("GetUnleashData")) {
      return { status: 200, bodyText: "{}" }
    }
    return { status: 200, bodyText: JSON.stringify(responseBody) }
  })
}

function setupSqliteMock(ctx, authJson, protoBase64) {
  ctx.host.sqlite.query.mockImplementation((db, sql) => {
    if (sql.includes("agentManagerInitState") && protoBase64) {
      return JSON.stringify([{ value: protoBase64 }])
    }
    if (sql.includes("antigravityAuthStatus") && authJson) {
      return JSON.stringify([{ value: authJson }])
    }
    return "[]"
  })
}

function setupProfileSqliteMock(ctx, profiles) {
  ctx.host.sqlite.query.mockImplementation((db, sql) => {
    const profile = profiles[db] || {}
    if (sql.includes("antigravityAuthStatus") && profile.authJson) {
      return JSON.stringify([{ value: profile.authJson }])
    }
    if (sql.includes("antigravityUnifiedStateSync.oauthToken") && profile.oauthTopic) {
      return JSON.stringify([{ value: profile.oauthTopic }])
    }
    if (sql.includes("jetskiStateSync.agentManagerInitState") && profile.legacyProto) {
      return JSON.stringify([{ value: profile.legacyProto }])
    }
    return "[]"
  })
}

function makeProtobufBase64(ctx, accessToken, refreshToken, expirySeconds) {
  function encodeVarint(n) {
    var bytes = ""
    while (n > 0x7f) {
      bytes += String.fromCharCode((n & 0x7f) | 0x80)
      n = Math.floor(n / 128)
    }
    bytes += String.fromCharCode(n & 0x7f)
    return bytes
  }
  function encodeField(fieldNum, wireType, data) {
    var tag = encodeVarint(fieldNum * 8 + wireType)
    if (wireType === 2) return tag + encodeVarint(data.length) + data
    if (wireType === 0) return tag + encodeVarint(data)
    return ""
  }
  var inner = ""
  if (accessToken) inner += encodeField(1, 2, accessToken)
  if (refreshToken) inner += encodeField(3, 2, refreshToken)
  if (expirySeconds !== null && expirySeconds !== undefined) {
    var tsMsg = encodeField(1, 0, expirySeconds)
    inner += encodeField(4, 2, tsMsg)
  }
  var outer = encodeField(6, 2, inner)
  return ctx.base64.encode(outer)
}

function makeTopicOAuthBase64(ctx, accessToken, refreshToken, expirySeconds) {
  function encodeVarint(n) {
    var bytes = ""
    while (n > 0x7f) {
      bytes += String.fromCharCode((n & 0x7f) | 0x80)
      n = Math.floor(n / 128)
    }
    bytes += String.fromCharCode(n & 0x7f)
    return bytes
  }
  function encodeField(fieldNum, wireType, data) {
    var tag = encodeVarint(fieldNum * 8 + wireType)
    if (wireType === 2) return tag + encodeVarint(data.length) + data
    if (wireType === 0) return tag + encodeVarint(data)
    return ""
  }

  var oauthInfo = ""
  if (accessToken) oauthInfo += encodeField(1, 2, accessToken)
  if (refreshToken) oauthInfo += encodeField(3, 2, refreshToken)
  if (expirySeconds !== null && expirySeconds !== undefined) {
    oauthInfo += encodeField(4, 2, encodeField(1, 0, expirySeconds))
  }

  var row = encodeField(1, 2, ctx.base64.encode(oauthInfo))
  var unrelatedEntry = encodeField(1, 2, "authStateWithContextSentinelKey")
  unrelatedEntry += encodeField(2, 2, encodeField(1, 2, "not-an-oauth-token"))
  var oauthEntry = encodeField(1, 2, "oauthTokenInfoSentinelKey")
  oauthEntry += encodeField(2, 2, row)
  var topic = encodeField(1, 2, unrelatedEntry) + encodeField(1, 2, oauthEntry)
  return ctx.base64.encode(topic)
}

// --- Tests ---

describe("antigravity plugin", () => {
  beforeEach(() => {
    delete globalThis.__quotracker_plugin
    vi.resetModules()
  })

  it("declares Window Starter with agy only and both windows default off", () => {
    expect(pluginManifest.windowStarter).toEqual({
      enabledByDefault: false,
      defaultRunner: "agy",
      allowedRunners: ["agy"],
      windows: [
        { id: "session", line: "Session", weeklyLine: "Weekly", enabledByDefault: false },
        { id: "claude", line: "Claude", weeklyLine: "Claude Wk", enabledByDefault: false },
      ],
    })
  })

  it("throws when LS not found and no DB credentials", async () => {
    const ctx = makeCtx()
    ctx.host.ls.discover.mockReturnValue(null)
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
  })

  it("throws when no working port found and no DB credentials", async () => {
    const ctx = makeCtx()
    ctx.host.ls.discover.mockReturnValue(makeDiscovery())
    ctx.host.http.request.mockImplementation(() => {
      throw new Error("connection refused")
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
  })

  it("throws when both GetUserStatus and GetCommandModelConfigs fail", async () => {
    const ctx = makeCtx()
    ctx.host.ls.discover.mockReturnValue(makeDiscovery())
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetUnleashData")) {
        return { status: 200, bodyText: "{}" }
      }
      return { status: 500, bodyText: "" }
    })
    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
  })

  it("returns models + plan from GetUserStatus", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse()
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    // No userTier in default fixture → falls back to planInfo.planName
    expect(result.plan).toBe("Pro")

    // Legacy model endpoints expose two pooled five-hour lines.
    const labels = result.lines.map((l) => l.label)
    expect(labels).toEqual(["Session", "Claude"])
  })

  it("deduplicates models by normalized label (keeps worst-case fraction)", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse()
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    // Both Gemini 3.1 Pro variants have frac=0.8 → used = 20%
    const pro = result.lines.find((l) => l.label === "Session")
    expect(pro).toBeTruthy()
    expect(pro.used).toBe(20) // (1 - 0.8) * 100
  })

  it("orders: Gemini (Pro, Flash), Claude (Opus, Sonnet), then others", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse()
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const labels = result.lines.map((l) => l.label)

    expect(labels).toEqual(["Session", "Claude"])
  })

  it("falls back to GetCommandModelConfigs when GetUserStatus fails", async () => {
    const ctx = makeCtx()
    ctx.host.ls.discover.mockReturnValue(makeDiscovery())
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("GetUnleashData")) {
        return { status: 200, bodyText: "{}" }
      }
      if (String(opts.url).includes("GetUserStatus")) {
        return { status: 500, bodyText: "" }
      }
      if (String(opts.url).includes("GetCommandModelConfigs")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            clientModelConfigs: [
              {
                label: "Gemini 3 Pro (High)",
                modelOrAlias: { model: "M7" },
                quotaInfo: { remainingFraction: 0.6, resetTime: "2026-02-08T09:10:56Z" },
              },
            ],
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.plan).toBeNull()

    // Model lines present
    const pro = result.lines.find((l) => l.label === "Session")
    expect(pro).toBeTruthy()
    expect(pro.used).toBe(40) // (1 - 0.6) * 100
  })

  it("uses extension port as fallback when all ports fail probing", async () => {
    const ctx = makeCtx()
    ctx.host.ls.discover.mockReturnValue(makeDiscovery({ ports: [99999], extensionPort: 42010 }))

    let usedPort = null
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetUnleashData") && url.includes("99999")) {
        throw new Error("refused")
      }
      if (url.includes("GetUserStatus")) {
        usedPort = parseInt(url.match(/:(\d+)\//)[1])
        return {
          status: 200,
          bodyText: JSON.stringify(makeUserStatusResponse()),
        }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(usedPort).toBe(42010)
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it("treats models with no quotaInfo as depleted (100% used)", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      configs: [
        { label: "Gemini 3 Pro (High)", modelOrAlias: { model: "M7" }, quotaInfo: { remainingFraction: 0.5, resetTime: "2026-02-08T09:10:56Z" } },
        { label: "Claude Opus 4.6 (Thinking)", modelOrAlias: { model: "M26" } },
      ],
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const claude = result.lines.find((l) => l.label === "Claude")
    expect(claude).toBeTruthy()
    expect(claude.used).toBe(100)
    expect(claude.limit).toBe(100)
    expect(claude.resetsAt).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("dedup picks depleted variant (no quotaInfo) over non-depleted sibling", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      configs: [
        { label: "Gemini 3 Pro (High)", modelOrAlias: { model: "M7" }, quotaInfo: { remainingFraction: 0.75, resetTime: "2026-02-08T09:10:56Z" } },
        { label: "Gemini 3 Pro (Low)", modelOrAlias: { model: "M8" } },
      ],
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const pro = result.lines.find((l) => l.label === "Session")
    expect(pro).toBeTruthy()
    expect(pro.used).toBe(100)
    expect(pro.resetsAt).toBeUndefined()
  })

  it("returns lines when all models are depleted (no quotaInfo)", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      configs: [
        { label: "Gemini 3 Pro (High)", modelOrAlias: { model: "M7" } },
        { label: "Claude Opus 4.6 (Thinking)", modelOrAlias: { model: "M26" } },
      ],
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result).toBeTruthy()
    const labels = result.lines.map((l) => l.label)
    expect(labels).toEqual(["Session", "Claude"])
    expect(result.lines.every((l) => l.used === 100)).toBe(true)
  })

  it("skips configs with missing or empty labels", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      configs: [
        { label: "Gemini 3 Pro (High)", modelOrAlias: { model: "M7" }, quotaInfo: { remainingFraction: 0.5, resetTime: "2026-02-08T09:10:56Z" } },
        { label: "", modelOrAlias: { model: "M99" }, quotaInfo: { remainingFraction: 0.8, resetTime: "2026-02-08T09:10:56Z" } },
        { modelOrAlias: { model: "M100" }, quotaInfo: { remainingFraction: 0.9, resetTime: "2026-02-08T09:10:56Z" } },
      ],
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.length).toBe(1)
    expect(result.lines[0].label).toBe("Session")
  })

  it("includes resetsAt on model lines", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse()
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const pro = result.lines.find((l) => l.label === "Session")
    expect(pro.resetsAt).toBe("2026-02-08T09:10:56Z")
  })

  it("clamps remainingFraction outside 0-1 range", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      configs: [
        { label: "Gemini Pro (Over)", modelOrAlias: { model: "M1" }, quotaInfo: { remainingFraction: 1.5, resetTime: "2026-02-08T09:10:56Z" } },
        { label: "Gemini Flash (Neg)", modelOrAlias: { model: "M2" }, quotaInfo: { remainingFraction: -0.3, resetTime: "2026-02-08T09:10:56Z" } },
      ],
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const session = result.lines.find((l) => l.label === "Session")
    expect(session.used).toBe(100) // worst Gemini fraction is -0.3 → 100% used
  })

  it("handles missing resetTime gracefully", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      configs: [
        { label: "Gemini Pro (No Reset)", modelOrAlias: { model: "M1" }, quotaInfo: { remainingFraction: 0.5 } },
      ],
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const line = result.lines.find((l) => l.label === "Session")
    expect(line).toBeTruthy()
    expect(line.used).toBe(50)
    expect(line.resetsAt).toBeUndefined()
  })

  it("probes ports with HTTPS first, then HTTP, picks first success", async () => {
    const ctx = makeCtx()
    ctx.host.ls.discover.mockReturnValue(makeDiscovery({ ports: [10001, 10002] }))

    const probed = []
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetUnleashData")) {
        const port = parseInt(url.match(/:(\d+)\//)[1])
        const scheme = url.startsWith("https") ? "https" : "http"
        probed.push({ port, scheme })
        // Port 10001 refuses both, port 10002 accepts HTTPS
        if (port === 10002 && scheme === "https") return { status: 200, bodyText: "{}" }
        throw new Error("refused")
      }
      return { status: 200, bodyText: JSON.stringify(makeUserStatusResponse()) }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
    // Should try HTTPS then HTTP on 10001 (both fail), then HTTPS on 10002 (success)
    expect(probed).toEqual([
      { port: 10001, scheme: "https" },
      { port: 10001, scheme: "http" },
      { port: 10002, scheme: "https" },
    ])
  })

  it("includes apiKey in LS metadata when DB has credentials", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson())
    const discovery = makeDiscovery()
    ctx.host.ls.discover.mockReturnValue(discovery)

    let capturedMetadata = null
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetUnleashData")) {
        return { status: 200, bodyText: "{}" }
      }
      if (url.includes("GetUserStatus")) {
        const body = JSON.parse(opts.bodyText)
        capturedMetadata = body.metadata
        return { status: 200, bodyText: JSON.stringify(makeUserStatusResponse()) }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedMetadata).toBeTruthy()
    expect(capturedMetadata.apiKey).toBe("test-api-key-123")
    expect(capturedMetadata.ideName).toBe("antigravity")
  })

  it("discovers the Linux language server and sends Linux request context", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    let discoverOptions = null
    let unleashContext = null
    ctx.host.ls.discover.mockImplementation((options) => {
      discoverOptions = options
      return discovery
    })
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetUnleashData")) {
        unleashContext = JSON.parse(opts.bodyText).context.properties
        return { status: 200, bodyText: "{}" }
      }
      if (url.includes("GetUserStatus")) {
        return { status: 200, bodyText: JSON.stringify(makeUserStatusResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.lines.length).toBeGreaterThan(0)
    expect(discoverOptions).toEqual(expect.objectContaining({
      processName: "language_server_linux",
      markers: ["antigravity", "antigravity-ide"],
    }))
    expect(ctx.host.ls.discover).toHaveBeenCalledTimes(1)
    expect(unleashContext.os).toBe("linux")
  })

  it("falls back to the markerless agy server when the language server is unavailable", async () => {
    const ctx = makeCtx()
    const agyDiscovery = makeDiscovery({ csrf: "", ports: [42003] })
    const discoverOptions = []
    ctx.host.ls.discover.mockImplementation((options) => {
      discoverOptions.push(options)
      if (options.processName === "language_server_linux") return null
      return agyDiscovery
    })

    const calledUrls = []
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      calledUrls.push(url)
      if (url.includes("GetUnleashData")) {
        expect(opts.headers["x-codeium-csrf-token"]).toBe("")
        expect(JSON.parse(opts.bodyText).context.properties.os).toBe("linux")
        return { status: 200, bodyText: "{}" }
      }
      if (url.includes("RetrieveUserQuotaSummary")) {
        return { status: 200, bodyText: JSON.stringify(makeQuotaSummaryResponse(true)) }
      }
      if (url.includes("GetUserStatus")) {
        return { status: 200, bodyText: JSON.stringify(makeUserStatusResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(discoverOptions[0]).toEqual(expect.objectContaining({
      processName: "language_server_linux",
      markers: ["antigravity", "antigravity-ide"],
      csrfFlag: "--csrf_token",
    }))
    expect(discoverOptions[1]).toEqual({
      processName: "agy",
      markers: [],
      csrfFlag: null,
      portFlag: null,
    })
    expect(result.lines.map((line) => line.label)).toEqual(["Session", "Weekly", "Claude", "Claude Wk"])
    expect(calledUrls.every((url) => !url.includes("cloudcode-pa.googleapis.com"))).toBe(true)
  })

  it("prefers the local quota summary and returns five-hour and weekly pools", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const methods = []
    ctx.host.ls.discover.mockReturnValue(discovery)
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      const method = url.split("/").pop()
      methods.push(method)
      if (method === "GetUnleashData") return { status: 200, bodyText: "{}" }
      if (method === "RetrieveUserQuotaSummary") {
        return { status: 200, bodyText: JSON.stringify(makeQuotaSummaryResponse(true)) }
      }
      if (method === "GetUserStatus") {
        return { status: 200, bodyText: JSON.stringify(makeUserStatusResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.plan).toBe("Pro")
    expect(result.lines.map((line) => line.label)).toEqual(["Session", "Weekly", "Claude", "Claude Wk"])
    expect(result.lines.map((line) => line.used)).toEqual([25, 10, 60, 0])
    expect(result.lines.map((line) => line.periodDurationMs)).toEqual([
      5 * 60 * 60 * 1000,
      7 * 24 * 60 * 60 * 1000,
      5 * 60 * 60 * 1000,
      7 * 24 * 60 * 60 * 1000,
    ])
    expect(methods.indexOf("RetrieveUserQuotaSummary")).toBeLessThan(methods.indexOf("GetUserStatus"))
    expect(methods).not.toContain("GetCommandModelConfigs")
  })

  it("treats an empty local quota summary as authoritative", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const methods = []
    ctx.host.ls.discover.mockReturnValue(discovery)
    ctx.host.http.request.mockImplementation((opts) => {
      const method = String(opts.url).split("/").pop()
      methods.push(method)
      if (method === "GetUnleashData") return { status: 200, bodyText: "{}" }
      if (method === "RetrieveUserQuotaSummary") {
        return { status: 200, bodyText: JSON.stringify({ response: { groups: [] } }) }
      }
      if (method === "GetUserStatus") {
        return { status: 200, bodyText: JSON.stringify(makeUserStatusResponse()) }
      }
      if (method === "GetCommandModelConfigs") {
        throw new Error("empty local summary must not fall through to legacy models")
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.plan).toBe("Pro")
    expect(result.lines).toEqual([])
    expect(methods).not.toContain("GetCommandModelConfigs")
  })

  it("works without apiKey when SQLite returns empty", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse()
    setupLsMock(ctx, discovery, response)

    let capturedMetadata = null
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetUnleashData")) {
        return { status: 200, bodyText: "{}" }
      }
      if (url.includes("GetUserStatus")) {
        const body = JSON.parse(opts.bodyText)
        capturedMetadata = body.metadata
        return { status: 200, bodyText: JSON.stringify(response) }
      }
      return { status: 200, bodyText: "{}" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.lines.length).toBeGreaterThan(0)
    expect(capturedMetadata).toBeTruthy()
    expect(capturedMetadata.apiKey).toBeUndefined()
  })

  it("falls back to Cloud Code API when LS is not available", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test-token", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("fetchAvailableModels")) {
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.plan).toBeNull()
    const labels = result.lines.map((l) => l.label)
    expect(labels).toContain("Session")
    expect(labels).toContain("Claude")
  })

  it("uses the Cloud Code quota summary before legacy model endpoints", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.summary-token", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    const calledUrls = []
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      calledUrls.push(url)
      if (url.includes("retrieveUserQuotaSummary")) {
        return { status: 200, bodyText: JSON.stringify(makeQuotaSummaryResponse(false)) }
      }
      if (url.includes("fetchAvailableModels")) {
        throw new Error("legacy endpoint must not be called after a valid summary")
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.lines.map((line) => line.label)).toEqual(["Session", "Weekly", "Claude", "Claude Wk"])
    expect(result.lines.map((line) => line.periodDurationMs)).toEqual([
      5 * 60 * 60 * 1000,
      7 * 24 * 60 * 60 * 1000,
      5 * 60 * 60 * 1000,
      7 * 24 * 60 * 60 * 1000,
    ])
    expect(calledUrls[0]).toContain("retrieveUserQuotaSummary")
    expect(calledUrls.some((url) => url.includes("fetchAvailableModels"))).toBe(false)
  })

  it("treats an empty Cloud Code summary as authoritative", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.empty-summary", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("retrieveUserQuotaSummary")) {
        return { status: 200, bodyText: JSON.stringify({ groups: [] }) }
      }
      if (url.includes("fetchAvailableModels")) {
        throw new Error("empty summary must not fall through to legacy models")
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.lines).toEqual([])
  })

  it("Cloud Code sends correct Authorization header with proto token", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.proto-token", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedHeaders = null
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("fetchAvailableModels")) {
        capturedHeaders = opts.headers
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedHeaders).toBeTruthy()
    expect(capturedHeaders.Authorization).toBe("Bearer ya29.proto-token")
    expect(capturedHeaders["User-Agent"]).toBe("antigravity")
  })

  it("Cloud Code returns null on 401/403 (invalid token, no refresh)", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.bad-token", null, futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("fetchAvailableModels")) {
        return { status: 401, bodyText: '{"error":"unauthorized"}' }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
  })

  it("Cloud Code tries multiple base URLs", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test-token", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    const calledUrls = []
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("fetchAvailableModels")) {
        calledUrls.push(url)
        if (url.includes("daily-cloudcode")) {
          throw new Error("network error")
        }
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(calledUrls.length).toBe(2)
    expect(calledUrls[0]).toContain("daily-cloudcode-pa.googleapis.com")
    expect(calledUrls[1]).toContain("cloudcode-pa.googleapis.com")
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it("Cloud Code correctly parses model quota response", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test-token", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            models: {
              "gemini-3-pro-high": {
                displayName: "Gemini 3 Pro (High)",
                quotaInfo: { remainingFraction: 0.7, resetTime: "2026-02-08T12:00:00Z" },
              },
              "gemini-3-pro-low": {
                displayName: "Gemini 3 Pro (Low)",
                quotaInfo: { remainingFraction: 0.9, resetTime: "2026-02-08T12:00:00Z" },
              },
            },
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const pro = result.lines.find((l) => l.label === "Session")
    expect(pro).toBeTruthy()
    expect(pro.used).toBe(30)
  })

  it("skips Cloud Code when no credentials available", async () => {
    const ctx = makeCtx()
    ctx.host.ls.discover.mockReturnValue(null)

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
    expect(ctx.host.http.request).not.toHaveBeenCalled()
  })

  it("LS takes priority over Cloud Code when both available", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test-token", "1//refresh", futureExpiry))
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse()
    setupLsMock(ctx, discovery, response)
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test-token", "1//refresh", futureExpiry))

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    // No userTier in default fixture → falls back to planInfo.planName
    expect(result.plan).toBe("Pro")
    const calls = ctx.host.http.request.mock.calls.map((c) => String(c[0].url))
    const ccCalls = calls.filter((u) => u.includes("fetchAvailableModels"))
    expect(ccCalls.length).toBe(0)
  })

  it("Cloud Code treats models without quotaInfo as depleted (100% used)", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test-token", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            models: {
              "valid-model": {
                displayName: "Gemini 3 Pro",
                quotaInfo: { remainingFraction: 0.5, resetTime: "2026-02-08T12:00:00Z" },
              },
              "no-quota": {
                displayName: "Gemini Flash (No Quota)",
              },
            },
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const noQuota = result.lines.find((l) => l.label === "Session")
    expect(noQuota).toBeTruthy()
    expect(noQuota.used).toBe(100)
    expect(noQuota.limit).toBe(100)
    expect(noQuota.resetsAt).toBeUndefined()
    expect(result.lines.find((l) => l.label === "Session")).toBeTruthy()
  })

  it("decodes protobuf tokens from SQLite", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    const protoB64 = makeProtobufBase64(ctx, "ya29.test-access", "1//refresh-token", futureExpiry)
    setupSqliteMock(ctx, makeAuthStatusJson(), protoB64)
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer ya29.test-access")
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it("reads current OAuth Topic tokens from the Linux standalone profile", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    const standaloneDb = "~/.config/Antigravity/User/globalStorage/state.vscdb"
    setupProfileSqliteMock(ctx, {
      [standaloneDb]: {
        oauthTopic: makeTopicOAuthBase64(ctx, "ya29.current-standalone", "1//refresh", futureExpiry),
      },
    })
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer ya29.current-standalone")
    expect(result.lines.length).toBeGreaterThan(0)
    expect(ctx.host.sqlite.query.mock.calls[0][0]).toBe(standaloneDb)
  })

  it("skips a stale standalone profile and selects the Linux IDE OAuth profile", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    const standaloneDb = "~/.config/Antigravity/User/globalStorage/state.vscdb"
    const ideDb = "~/.config/Antigravity IDE/User/globalStorage/state.vscdb"
    setupProfileSqliteMock(ctx, {
      [standaloneDb]: {
        authJson: makeAuthStatusJson({ apiKey: "stale-api-key" }),
        oauthTopic: "stale-topic-data",
      },
      [ideDb]: {
        oauthTopic: makeTopicOAuthBase64(ctx, "ya29.current-ide", "1//refresh", futureExpiry),
      },
    })
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer ya29.current-ide")
    const queriedPaths = ctx.host.sqlite.query.mock.calls.map((call) => call[0])
    expect(queriedPaths).toContain(standaloneDb)
    expect(queriedPaths).toContain(ideDb)
  })

  it("handles missing protobuf data gracefully (falls back to apiKey)", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson())
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer test-api-key-123")
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it("handles corrupt protobuf base64 gracefully (falls back to apiKey)", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson(), "not-valid-protobuf!!!")
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer test-api-key-123")
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it("handles protobuf with no refresh_token or expiry", async () => {
    const ctx = makeCtx()
    const protoB64 = makeProtobufBase64(ctx, "ya29.access-only", null, null)
    setupSqliteMock(ctx, makeAuthStatusJson(), protoB64)
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer ya29.access-only")
  })

  it("tries proto token first, then apiKey on auth failure", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    const protoB64 = makeProtobufBase64(ctx, "ya29.proto-first", "1//refresh", futureExpiry)
    setupSqliteMock(ctx, makeAuthStatusJson(), protoB64)
    ctx.host.ls.discover.mockReturnValue(null)

    const capturedTokens = []
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("fetchAvailableModels")) {
        capturedTokens.push(opts.headers.Authorization)
        if (opts.headers.Authorization === "Bearer ya29.proto-first") {
          return { status: 401, bodyText: '{"error":"unauthorized"}' }
        }
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(capturedTokens[0]).toBe("Bearer ya29.proto-first")
    expect(capturedTokens[capturedTokens.length - 1]).toBe("Bearer test-api-key-123")
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it("tries both valid tokens without refreshing", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    const protoB64 = makeProtobufBase64(ctx, "ya29.both-fail", "1//refresh", futureExpiry)
    setupSqliteMock(ctx, makeAuthStatusJson(), protoB64)
    ctx.host.ls.discover.mockReturnValue(null)

    const capturedTokens = []
    let oauthCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("oauth2.googleapis.com")) {
        oauthCalls += 1
        return { status: 500, bodyText: "" }
      }
      if (url.includes("fetchAvailableModels")) {
        capturedTokens.push(opts.headers.Authorization)
        return { status: 401, bodyText: '{"error":"unauthorized"}' }
      }
      if (url.includes("retrieveUserQuotaSummary")) return { status: 500, bodyText: "" }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")

    expect(oauthCalls).toBe(0)
    expect(capturedTokens.filter((t) => t === "Bearer ya29.both-fail").length).toBeGreaterThan(0)
    expect(capturedTokens.filter((t) => t === "Bearer test-api-key-123").length).toBeGreaterThan(0)
  })

  it("deduplicates identical tokens", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    const protoB64 = makeProtobufBase64(ctx, "ya29.same-token", "1//refresh", futureExpiry)
    setupSqliteMock(ctx, makeAuthStatusJson({ apiKey: "ya29.same-token" }), protoB64)
    ctx.host.ls.discover.mockReturnValue(null)

    const capturedTokens = []
    let oauthCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("oauth2.googleapis.com")) {
        oauthCalls += 1
        return { status: 500, bodyText: "" }
      }
      if (url.includes("fetchAvailableModels")) {
        capturedTokens.push(opts.headers.Authorization)
        if (opts.headers.Authorization === "Bearer ya29.same-token") {
          return { status: 401, bodyText: '{"error":"unauthorized"}' }
        }
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")

    const sameTokenCalls = capturedTokens.filter((t) => t === "Bearer ya29.same-token")
    expect(sameTokenCalls.length).toBe(1)
    expect(oauthCalls).toBe(0)
  })

  it("uses apiKey as only token when proto data unavailable", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson())
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer test-api-key-123")
  })

  it("uses cached token before falling back to apiKey", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson())
    ctx.host.ls.discover.mockReturnValue(null)

    const cachePath = ctx.app.pluginDataDir + "/auth.json"
    ctx.host.fs.writeText(cachePath, JSON.stringify({
      accessToken: "ya29.cached-token",
      expiresAtMs: Date.now() + 3600000,
    }))

    const capturedTokens = []
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedTokens.push(opts.headers.Authorization)
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedTokens[0]).toBe("Bearer ya29.cached-token")
  })

  it("skips expired cached token", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson())
    ctx.host.ls.discover.mockReturnValue(null)

    const cachePath = ctx.app.pluginDataDir + "/auth.json"
    ctx.host.fs.writeText(cachePath, JSON.stringify({
      accessToken: "ya29.expired-cache",
      expiresAtMs: Date.now() - 1000,
    }))

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer test-api-key-123")
  })

  it("skips expired proto token and falls back to next token", async () => {
    const ctx = makeCtx()
    const pastExpiry = Math.floor(Date.now() / 1000) - 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.expired-proto-token", "1//refresh", pastExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer test-api-key-123")
  })

  it("does not refresh an expired current Topic token", async () => {
    const ctx = makeCtx()
    const standaloneDb = "~/.config/Antigravity/User/globalStorage/state.vscdb"
    const expiredToken = "ya29.expired-current-token"
    const pastExpiry = Math.floor(Date.now() / 1000) - 3600
    setupProfileSqliteMock(ctx, {
      [standaloneDb]: {
        authJson: makeAuthStatusJson({ apiKey: expiredToken }),
        oauthTopic: makeTopicOAuthBase64(ctx, expiredToken, "1//refresh-token", pastExpiry),
      },
    })
    ctx.host.ls.discover.mockReturnValue(null)

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
    expect(ctx.host.http.request).not.toHaveBeenCalled()
    expect(ctx.host.fs.writeText).not.toHaveBeenCalled()
  })

  it("does not send an expired apiKey in local metadata", async () => {
    const ctx = makeCtx()
    const standaloneDb = "~/.config/Antigravity/User/globalStorage/state.vscdb"
    const expiredToken = "ya29.expired-local-token"
    const pastExpiry = Math.floor(Date.now() / 1000) - 3600
    setupProfileSqliteMock(ctx, {
      [standaloneDb]: {
        authJson: makeAuthStatusJson({ apiKey: expiredToken }),
        oauthTopic: makeTopicOAuthBase64(ctx, expiredToken, "1//refresh-token", pastExpiry),
      },
    })
    ctx.host.ls.discover.mockImplementation((options) => {
      if (options.processName === "language_server_linux") return makeDiscovery()
      return null
    })

    let localMetadata = null
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("GetUnleashData") || url.includes("RetrieveUserQuotaSummary")) {
        localMetadata = JSON.parse(opts.bodyText).metadata
      }
      if (url.includes("GetUnleashData")) return { status: 200, bodyText: "{}" }
      if (url.includes("RetrieveUserQuotaSummary")) {
        return { status: 200, bodyText: JSON.stringify({ response: { groups: [] } }) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.lines).toEqual([])
    expect(localMetadata.apiKey).toBeUndefined()
  })

  it("handles missing/corrupt cache file gracefully", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson())
    ctx.host.ls.discover.mockReturnValue(null)

    const cachePath = ctx.app.pluginDataDir + "/auth.json"
    ctx.host.fs.writeText(cachePath, "{bad json")

    let capturedAuth = null
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        capturedAuth = opts.headers.Authorization
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedAuth).toBe("Bearer test-api-key-123")
  })

  it("Cloud Code skips models with isInternal flag", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test", "1//r", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            models: {
              "chat_20706": {
                model: "MODEL_CHAT_20706",
                isInternal: true,
                quotaInfo: { remainingFraction: 1, resetTime: "2026-02-08T10:00:00Z" },
              },
              "gemini-3-flash": {
                displayName: "Gemini 3 Flash",
                model: "MODEL_PLACEHOLDER_M18",
                quotaInfo: { remainingFraction: 0.9, resetTime: "2026-02-08T10:00:00Z" },
              },
            },
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const labels = result.lines.map((l) => l.label)
    expect(labels).toContain("Session")
    expect(labels).not.toContain("chat_20706")
    expect(labels).not.toContain("MODEL_CHAT_20706")
  })

  it("Cloud Code skips models with empty or missing displayName", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test", "1//r", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            models: {
              "tab_flash_lite": {
                displayName: "",
                model: "SOME_MODEL",
                quotaInfo: { remainingFraction: 1, resetTime: "2026-02-08T10:00:00Z" },
              },
              "no_display_name": {
                model: "ANOTHER_MODEL",
                quotaInfo: { remainingFraction: 1, resetTime: "2026-02-08T10:00:00Z" },
              },
              "gemini-3-pro": {
                displayName: "Gemini 3 Pro",
                model: "MODEL_PLACEHOLDER_M8",
                quotaInfo: { remainingFraction: 0.5, resetTime: "2026-02-08T10:00:00Z" },
              },
            },
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const labels = result.lines.map((l) => l.label)
    expect(labels).toEqual(["Session"])
  })

  it("Cloud Code skips blacklisted model IDs", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test", "1//r", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            models: {
              "gemini-2.5-flash": {
                displayName: "Gemini 2.5 Flash",
                model: "MODEL_GOOGLE_GEMINI_2_5_FLASH",
                quotaInfo: { remainingFraction: 1, resetTime: "2026-02-08T10:00:00Z" },
              },
              "gemini-2.5-pro": {
                displayName: "Gemini 2.5 Pro",
                model: "MODEL_GOOGLE_GEMINI_2_5_PRO",
                quotaInfo: { remainingFraction: 0.8, resetTime: "2026-02-08T10:00:00Z" },
              },
              "claude-sonnet-4.5": {
                displayName: "Claude Sonnet 4.5",
                model: "MODEL_CLAUDE_4_5_SONNET",
                quotaInfo: { remainingFraction: 0.6, resetTime: "2026-02-08T10:00:00Z" },
              },
            },
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const labels = result.lines.map((l) => l.label)
    expect(labels).toEqual(["Claude"])
  })

  it("Cloud Code keeps non-blacklisted models with valid displayName", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test", "1//r", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        return {
          status: 200,
          bodyText: JSON.stringify({
            models: {
              "gemini-3-pro-high": {
                displayName: "Gemini 3 Pro (High)",
                model: "MODEL_PLACEHOLDER_M8",
                quotaInfo: { remainingFraction: 0.7, resetTime: "2026-02-08T10:00:00Z" },
              },
              "claude-opus-4-6-thinking": {
                displayName: "Claude Opus 4.6 (Thinking)",
                model: "MODEL_PLACEHOLDER_M26",
                quotaInfo: { remainingFraction: 1, resetTime: "2026-02-08T10:00:00Z" },
              },
              "gpt-oss-120b": {
                displayName: "GPT-OSS 120B (Medium)",
                model: "MODEL_OPENAI_GPT_OSS_120B_MEDIUM",
                quotaInfo: { remainingFraction: 0.9, resetTime: "2026-02-08T10:00:00Z" },
              },
            },
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const labels = result.lines.map((l) => l.label)
    expect(labels).toEqual(["Session", "Claude"])
  })

  it("LS filters out blacklisted model IDs (Claude Opus 4.5)", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      configs: [
        {
          label: "Gemini 3 Pro (High)",
          modelOrAlias: { model: "MODEL_PLACEHOLDER_M8" },
          quotaInfo: { remainingFraction: 0.75, resetTime: "2026-02-08T09:10:56Z" },
        },
        {
          label: "Claude Opus 4.5 (Thinking)",
          modelOrAlias: { model: "MODEL_PLACEHOLDER_M12" },
          quotaInfo: { remainingFraction: 0.8, resetTime: "2026-02-08T09:10:56Z" },
        },
        {
          label: "Claude Opus 4.6 (Thinking)",
          modelOrAlias: { model: "MODEL_PLACEHOLDER_M26" },
          quotaInfo: { remainingFraction: 0.6, resetTime: "2026-02-08T09:10:56Z" },
        },
      ],
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const labels = result.lines.map((l) => l.label)
    expect(labels).toEqual(["Session", "Claude"])
  })

  it("LS still takes priority over Cloud Code with proto tokens (no regression)", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    const protoB64 = makeProtobufBase64(ctx, "ya29.proto-token", "1//refresh", futureExpiry)
    setupSqliteMock(ctx, makeAuthStatusJson(), protoB64)
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse()
    setupLsMock(ctx, discovery, response)
    setupSqliteMock(ctx, makeAuthStatusJson(), protoB64)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    // No userTier in default fixture → falls back to planInfo.planName
    expect(result.plan).toBe("Pro")
    const calls = ctx.host.http.request.mock.calls.map((c) => String(c[0].url))
    expect(calls.filter((u) => u.includes("fetchAvailableModels")).length).toBe(0)
    expect(calls.filter((u) => u.includes("oauth2.googleapis.com")).length).toBe(0)
  })

  it("throws when Cloud Code returns no models", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test-token", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        return { status: 200, bodyText: JSON.stringify({}) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
  })

  it("continues to next Cloud Code base URL after non-2xx response", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.test-token", "1//refresh", futureExpiry))
    ctx.host.ls.discover.mockReturnValue(null)

    let ccCalls = 0
    ctx.host.http.request.mockImplementation((opts) => {
      if (String(opts.url).includes("fetchAvailableModels")) {
        ccCalls += 1
        if (ccCalls === 1) return { status: 500, bodyText: "{}" }
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.length).toBeGreaterThan(0)
    expect(ccCalls).toBe(2)
  })

  it("prefers userTier.name over legacy planInfo.planName for Ultra subscribers", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      userTier: {
        id: "g1-ultra-tier",
        name: "Google AI Ultra",
        description: "Google AI Ultra",
        upgradeSubscriptionText: "You are subscribed to the best plan.",
      },
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.plan).toBe("Google AI Ultra")
    const labels = result.lines.map((l) => l.label)
    expect(labels).toEqual(["Session", "Claude"])
  })

  it("falls back to planInfo.planName when userTier is absent", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse()  // no userTier override
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.plan).toBe("Pro")
  })

  it("falls back to planInfo.planName when userTier.name is empty", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    const response = makeUserStatusResponse({
      userTier: { id: "g1-pro-tier", name: "" },
    })
    setupLsMock(ctx, discovery, response)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.plan).toBe("Pro")
  })

  it("keeps resetsAt on a 5-hour window that still rounds to 0% used", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    ctx.host.ls.discover.mockReturnValue(discovery)
    ctx.host.http.request.mockImplementation((opts) => {
      const method = String(opts.url).split("/").pop()
      if (method === "GetUnleashData") return { status: 200, bodyText: "{}" }
      if (method === "RetrieveUserQuotaSummary") {
        return {
          status: 200,
          bodyText: JSON.stringify({
            response: {
              groups: [
                {
                  buckets: [
                    { bucketId: "gemini-5h", remainingFraction: 0.9978, resetTime: "2026-07-02T16:00:00Z" },
                    { bucketId: "3p-5h", remainingFraction: 1, resetTime: "2026-07-02T15:30:00Z" },
                    { bucketId: "gemini-weekly", remainingFraction: 0.9, resetTime: "2026-07-06T07:00:00Z" },
                  ],
                },
              ],
            },
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const session = result.lines.find((line) => line.label === "Session")
    const claude = result.lines.find((line) => line.label === "Claude")
    const weekly = result.lines.find((line) => line.label === "Weekly")
    expect(session.used).toBe(0)
    expect(session.resetsAt).toBe("2026-07-02T16:00:00Z")
    expect(claude.used).toBe(0)
    expect(claude.resetsAt).toBe("2026-07-02T15:30:00Z")
    expect(weekly.resetsAt).toBeTruthy()
  })

  it("omits resetsAt on five-hour windows when the API has no resetTime", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    ctx.host.ls.discover.mockReturnValue(discovery)
    ctx.host.http.request.mockImplementation((opts) => {
      const method = String(opts.url).split("/").pop()
      if (method === "GetUnleashData") return { status: 200, bodyText: "{}" }
      if (method === "RetrieveUserQuotaSummary") {
        return {
          status: 200,
          bodyText: JSON.stringify({
            response: {
              groups: [
                {
                  buckets: [
                    { bucketId: "gemini-5h", remainingFraction: 1 },
                    { bucketId: "3p-5h", remainingFraction: 0.99 },
                    { bucketId: "gemini-weekly", remainingFraction: 0.9, resetTime: "2026-07-06T07:00:00Z" },
                  ],
                },
              ],
            },
          }),
        }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    const session = result.lines.find((line) => line.label === "Session")
    const claude = result.lines.find((line) => line.label === "Claude")
    expect(session.used).toBe(0)
    expect(session.resetsAt).toBeUndefined()
    expect(claude.used).toBe(1)
    expect(claude.resetsAt).toBeUndefined()
  })

  it("limits conversation spend tiles to the last 30 days", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"))
    const ctx = makeCtx()
    setupLsMock(ctx, makeDiscovery(), makeUserStatusResponse())
    ctx.host.fs.writeText("~/.gemini/antigravity-cli/conversations/session.db", "sqlite")
    ctx.host.sqlite.query.mockImplementation((_db, sql) => {
      if (String(sql).includes("FROM generations")) {
        return JSON.stringify([
          { ms: Date.UTC(2026, 2, 6), tokens: 100, cost: 1.25 },
          { ms: Date.UTC(2026, 1, 1), tokens: 9999, cost: 50 },
        ])
      }
      return "[]"
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Today").value).toBe("$1.25 · 100 tokens")
    expect(result.lines.find((line) => line.label === "Last 30 Days").value).toBe("$1.25 · 100 tokens")
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    vi.useRealTimers()
  })

  it("keeps quota meters when conversation DBs are missing", async () => {
    const ctx = makeCtx()
    const discovery = makeDiscovery()
    setupLsMock(ctx, discovery, makeUserStatusResponse())
    ctx.host.sqlite.query.mockImplementation((db, sql) => {
      if (String(sql).includes("FROM generations")) {
        throw new Error("no such table")
      }
      return "[]"
    })

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)
    expect(result.lines.find((line) => line.label === "Session")).toBeTruthy()
    expect(result.lines.find((line) => line.label === "Today")).toBeUndefined()
  })

  // --- Stale quota snapshot ---

  function writeSnapshot(ctx, lines, plan) {
    ctx.host.fs.writeText(
      ctx.app.pluginDataDir + "/quota-snapshot.json",
      JSON.stringify({
        savedAt: "2026-07-02T10:00:00.000Z",
        plan: plan === undefined ? "Pro" : plan,
        lines,
      }),
    )
  }

  function staleSessionLines() {
    return [
      {
        type: "progress",
        label: "Session",
        used: 25,
        limit: 100,
        format: { kind: "percent" },
        resetsAt: "2026-07-02T16:00:00Z",
        periodDurationMs: 5 * 60 * 60 * 1000,
      },
      {
        type: "progress",
        label: "Weekly",
        used: 10,
        limit: 100,
        format: { kind: "percent" },
        resetsAt: "2026-07-06T07:00:00Z",
        periodDurationMs: 7 * 24 * 60 * 60 * 1000,
      },
    ]
  }

  it("persists a display-only snapshot after a successful probe", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.secret-token", "1//refresh", futureExpiry))
    setupLsMock(ctx, makeDiscovery(), makeUserStatusResponse())

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    const snapshot = JSON.parse(ctx.host.fs.readText(ctx.app.pluginDataDir + "/quota-snapshot.json"))
    expect(snapshot.plan).toBe("Pro")
    expect(snapshot.lines.map((line) => line.label)).toEqual(["Session", "Claude"])
    expect(snapshot.lines[0].periodDurationMs).toBe(5 * 60 * 60 * 1000)
    const serialized = JSON.stringify(snapshot)
    expect(serialized).not.toContain("ya29")
    expect(serialized).not.toContain("test-api-key-123")
    expect(result.statuses).toBeUndefined()
  })

  it("shows a stale snapshot instead of the error when every source fails", async () => {
    const ctx = makeCtx()
    writeSnapshot(ctx, staleSessionLines())
    ctx.host.ls.discover.mockReturnValue(null)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.plan).toBe("Pro")
    expect(result.lines.map((line) => line.label)).toEqual(["Session", "Weekly"])
    expect(result.statuses).toEqual([{ text: "Stale", tone: "warning" }])
    expect(result.error).toBe("Antigravity session expired. Start Antigravity or agy and try again.")
    expect(ctx.host.http.request).not.toHaveBeenCalled()
  })

  it("re-reads conversation spend on the stale path", async () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-03-06T12:00:00.000Z"))
    const ctx = makeCtx()
    writeSnapshot(ctx, staleSessionLines())
    ctx.host.fs.writeText("~/.gemini/antigravity-cli/conversations/session.db", "sqlite")
    ctx.host.sqlite.query.mockImplementation((_db, sql) => {
      if (String(sql).includes("FROM generations")) {
        return JSON.stringify([{ ms: Date.UTC(2026, 2, 6), tokens: 100, cost: 1.25 }])
      }
      return "[]"
    })
    ctx.host.ls.discover.mockReturnValue(null)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(result.statuses).toEqual([{ text: "Stale", tone: "warning" }])
    expect(result.error).toBe("Antigravity session expired. Start Antigravity or agy and try again.")
    expect(result.lines.find((line) => line.label === "Today").value).toBe("$1.25 · 100 tokens")
    expect(result.lines.find((line) => line.label === "Session").used).toBe(25)
    vi.useRealTimers()
  })

  it("ignores a corrupt or invalid snapshot and still throws the actionable error", async () => {
    const ctx = makeCtx()
    ctx.host.fs.writeText(ctx.app.pluginDataDir + "/quota-snapshot.json", "{bad json")
    ctx.host.ls.discover.mockReturnValue(null)

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
  })

  it("ignores a snapshot without usable lines", async () => {
    const ctx = makeCtx()
    writeSnapshot(ctx, [])
    ctx.host.ls.discover.mockReturnValue(null)

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
  })

  it("does not overwrite the snapshot with an empty successful reading", async () => {
    const ctx = makeCtx()
    ctx.host.ls.discover.mockReturnValue(makeDiscovery())
    let empty = false
    ctx.host.http.request.mockImplementation((opts) => {
      const method = String(opts.url).split("/").pop()
      if (method === "GetUnleashData") return { status: 200, bodyText: "{}" }
      if (method === "RetrieveUserQuotaSummary") {
        return {
          status: 200,
          bodyText: JSON.stringify(empty ? { response: { groups: [] } } : makeQuotaSummaryResponse(true)),
        }
      }
      if (method === "GetUserStatus") {
        return { status: 200, bodyText: JSON.stringify(makeUserStatusResponse()) }
      }
      return { status: 500, bodyText: "" }
    })

    const plugin = await loadPlugin()
    plugin.probe(ctx)
    const first = JSON.parse(ctx.host.fs.readText(ctx.app.pluginDataDir + "/quota-snapshot.json"))
    expect(first.lines.length).toBeGreaterThan(0)

    empty = true
    plugin.probe(ctx)
    const second = JSON.parse(ctx.host.fs.readText(ctx.app.pluginDataDir + "/quota-snapshot.json"))
    expect(second).toEqual(first)
  })

  it("writes nothing when the expired-token failure has no snapshot", async () => {
    const ctx = makeCtx()
    const standaloneDb = "~/.config/Antigravity/User/globalStorage/state.vscdb"
    const expiredToken = "ya29.expired-current-token"
    const pastExpiry = Math.floor(Date.now() / 1000) - 3600
    setupProfileSqliteMock(ctx, {
      [standaloneDb]: {
        authJson: makeAuthStatusJson({ apiKey: expiredToken }),
        oauthTopic: makeTopicOAuthBase64(ctx, expiredToken, "1//refresh-token", pastExpiry),
      },
    })
    ctx.host.ls.discover.mockReturnValue(null)

    const plugin = await loadPlugin()
    expect(() => plugin.probe(ctx)).toThrow("Antigravity session expired. Start Antigravity or agy and try again.")
    expect(ctx.host.http.request).not.toHaveBeenCalled()
    expect(ctx.host.fs.writeText).not.toHaveBeenCalled()
  })

  // --- agy keyring credential ---

  function keyringJson(accessToken, expiryIso) {
    return JSON.stringify({
      auth_method: "consumer",
      id_token: "eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJ0ZXN0In0.sig",
      token: {
        access_token: accessToken,
        token_type: "Bearer",
        refresh_token: "1//keyring-refresh",
        expiry: expiryIso,
      },
    })
  }

  // Go RFC3339Nano shape agy writes: nanosecond fraction plus numeric offset.
  // Wall clock is shifted +9h so the +09:00 offset keeps the instant future.
  function futureNanoIso() {
    const jstWallClockMs = Date.now() + 3600 * 1000 + 9 * 3600 * 1000
    return new Date(jstWallClockMs).toISOString().replace(/\.(\d{3})Z/, ".$1999999+09:00")
  }

  function setupKeyringMock(ctx, raw) {
    if (raw === null) {
      ctx.host.keychain.readGenericPassword.mockImplementation(() => {
        throw new Error("secret not found for attributes")
      })
      return
    }
    ctx.host.keychain.readGenericPassword.mockReturnValue(raw)
  }

  function setupCloudCodeCapture(ctx) {
    const capturedTokens = []
    ctx.host.ls.discover.mockReturnValue(null)
    ctx.host.http.request.mockImplementation((opts) => {
      const url = String(opts.url)
      if (url.includes("retrieveUserQuotaSummary")) return { status: 500, bodyText: "" }
      if (url.includes("fetchAvailableModels")) {
        capturedTokens.push(opts.headers.Authorization)
        return { status: 200, bodyText: JSON.stringify(makeCloudCodeResponse()) }
      }
      return { status: 500, bodyText: "" }
    })
    return capturedTokens
  }

  it("uses a fresh agy keyring token when the profile tokens are expired", async () => {
    const ctx = makeCtx()
    const pastExpiry = Math.floor(Date.now() / 1000) - 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.expired-proto", "1//refresh", pastExpiry))
    setupKeyringMock(ctx, keyringJson("ya29.keyring-fresh", futureNanoIso()))
    const capturedTokens = setupCloudCodeCapture(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(ctx.host.keychain.readGenericPassword).toHaveBeenCalledWith("gemini")
    expect(capturedTokens[0]).toBe("Bearer ya29.keyring-fresh")
    expect(result.lines.length).toBeGreaterThan(0)
    const calls = ctx.host.http.request.mock.calls.map((c) => String(c[0].url))
    expect(calls.filter((u) => u.includes("oauth2.googleapis.com")).length).toBe(0)
    expect(ctx.host.keychain.writeGenericPassword).not.toHaveBeenCalled()
  })

  it("uses a keyring token that matches an expired profile token", async () => {
    const ctx = makeCtx()
    const pastExpiry = Math.floor(Date.now() / 1000) - 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.same-token", "1//refresh", pastExpiry))
    setupKeyringMock(ctx, keyringJson("ya29.same-token", futureNanoIso()))
    const capturedTokens = setupCloudCodeCapture(ctx)

    const plugin = await loadPlugin()
    const result = plugin.probe(ctx)

    expect(capturedTokens[0]).toBe("Bearer ya29.same-token")
    expect(result.lines.length).toBeGreaterThan(0)
  })

  it("skips an expired agy keyring token", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson())
    setupKeyringMock(ctx, keyringJson("ya29.keyring-expired", new Date(Date.now() - 60 * 1000).toISOString()))
    const capturedTokens = setupCloudCodeCapture(ctx)

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedTokens).toEqual(["Bearer test-api-key-123"])
  })

  it("continues without the keyring when the entry is missing", async () => {
    const ctx = makeCtx()
    setupSqliteMock(ctx, makeAuthStatusJson())
    setupKeyringMock(ctx, null)
    const capturedTokens = setupCloudCodeCapture(ctx)

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedTokens).toEqual(["Bearer test-api-key-123"])
  })

  it("does not duplicate the keyring token when it matches the profile token", async () => {
    const ctx = makeCtx()
    const futureExpiry = Math.floor(Date.now() / 1000) + 3600
    setupSqliteMock(ctx, makeAuthStatusJson(), makeProtobufBase64(ctx, "ya29.same-as-keyring", "1//refresh", futureExpiry))
    setupKeyringMock(ctx, keyringJson("ya29.same-as-keyring", futureNanoIso()))
    const capturedTokens = setupCloudCodeCapture(ctx)

    const plugin = await loadPlugin()
    plugin.probe(ctx)

    expect(capturedTokens.filter((t) => t === "Bearer ya29.same-as-keyring").length).toBe(1)
  })
})
