(function () {
  const BASE_URL = "https://api.z.ai"
  const SUBSCRIPTION_URL = BASE_URL + "/api/biz/subscription/list"
  const QUOTA_URL = BASE_URL + "/api/monitor/usage/quota/limit"
  const MONTH_MS = 30 * 24 * 60 * 60 * 1000
  const DAY_MS = 24 * 60 * 60 * 1000
  const SINGAPORE_OFFSET_MS = 8 * 60 * 60 * 1000

  function loadApiKey(ctx) {
    const zai = ctx.host.env.get("ZAI_API_KEY")
    if (typeof zai === "string" && zai.trim()) return zai.trim()

    const glm = ctx.host.env.get("GLM_API_KEY")
    if (typeof glm === "string" && glm.trim()) return glm.trim()

    return null
  }

  function readNumber(value) {
    if (value === null || value === undefined || value === "") return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  function fetchSubscription(ctx, apiKey) {
    try {
      const resp = ctx.util.request({
        method: "GET",
        url: SUBSCRIPTION_URL,
        headers: {
          Authorization: "Bearer " + apiKey,
          Accept: "application/json",
        },
        timeoutMs: 10000,
      })
      if (resp.status < 200 || resp.status >= 300) {
        ctx.host.log.warn("subscription request failed: HTTP " + resp.status)
        return null
      }
      const data = ctx.util.tryParseJson(resp.bodyText)
      if (!data) return null
      const list = data.data
      if (!Array.isArray(list) || list.length === 0) return null
      return {
        productName: list[0].productName || null,
        nextRenewTime: list[0].nextRenewTime || null,
      }
    } catch (e) {
      ctx.host.log.warn("subscription request exception: " + String(e))
      return null
    }
  }

  function fetchQuota(ctx, apiKey) {
    let resp
    try {
      resp = ctx.util.request({
        method: "GET",
        url: QUOTA_URL,
        headers: {
          Authorization: "Bearer " + apiKey,
          Accept: "application/json",
        },
        timeoutMs: 10000,
      })
    } catch (e) {
      ctx.host.log.error("usage request exception: " + String(e))
      throw "Usage request failed. Check your connection."
    }

    if (ctx.util.isAuthStatus(resp.status)) {
      throw "API key invalid. Check your Z.ai API key."
    }

    if (resp.status < 200 || resp.status >= 300) {
      throw "Usage request failed (HTTP " + String(resp.status) + "). Try again later."
    }

    const data = ctx.util.tryParseJson(resp.bodyText)
    if (!data) {
      throw "Usage response invalid. Try again later."
    }

    return data
  }

  function isNoCodingPlan(quota) {
    if (!quota || quota.success !== false) return false
    const msg = typeof quota.msg === "string" ? quota.msg : ""
    return msg.toLowerCase().indexOf("coding plan") !== -1
  }

  function findLimit(limits, type) {
    for (let i = 0; i < limits.length; i++) {
      const item = limits[i]
      if (item.type === type || item.name === type) return item
    }
    return null
  }

  function isPeakHours(nowIso) {
    const nowMs = Date.parse(nowIso)
    if (!Number.isFinite(nowMs)) {
      throw "Invalid plugin clock."
    }

    const singaporeTime = new Date(nowMs + SINGAPORE_OFFSET_MS)
    const day = singaporeTime.getUTCDay()
    const hour = singaporeTime.getUTCHours()
    return day >= 1 && day <= 5 && hour >= 14 && hour < 18
  }

  function peakStatus(ctx) {
    const peak = isPeakHours(ctx.nowIso)
    return ctx.status.chip({
      text: peak ? "Peak" : "Off-Peak",
      tone: peak ? "danger" : "positive",
    })
  }

  function classifyTokenWindow(entry) {
    const unit = readNumber(entry.unit)
    const number = readNumber(entry.number)
    if (unit === null || number === null || number <= 0) {
      throw "Usage response invalid. Try again later."
    }
    let unitMs = null
    if (unit === 3) unitMs = 60 * 60 * 1000
    else if (unit === 4) unitMs = DAY_MS
    else if (unit === 6) unitMs = 7 * DAY_MS
    else if (unit === 5) unitMs = MONTH_MS
    else return null
    const periodMs = unitMs * number
    if (periodMs < 1) throw "Usage response invalid. Try again later."
    return periodMs < DAY_MS ? { kind: "session", periodMs: periodMs } : { kind: "weekly", periodMs: periodMs }
  }

  function percentLine(ctx, entry, label, periodMs) {
    const percentage = readNumber(entry.percentage)
    if (percentage === null) throw "Usage response invalid. Try again later."
    const used = Math.min(100, Math.max(0, percentage))
    const resetsAt = readNumber(entry.nextResetTime) !== null ? ctx.util.toIso(entry.nextResetTime) : undefined
    const opts = {
      label: label,
      used: used,
      limit: 100,
      format: { kind: "percent" },
      periodDurationMs: periodMs,
    }
    if (resetsAt) opts.resetsAt = resetsAt
    return ctx.line.progress(opts)
  }

  function toolCallLine(ctx, entry) {
    const used = readNumber(entry.currentValue)
    const limit = readNumber(entry.usage)
    if (used === null || limit === null || used < 0 || limit < 0) {
      throw "Usage response invalid. Try again later."
    }
    const resetFromPayload = readNumber(entry.nextResetTime)
    const now = new Date()
    const fallback = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1)).toISOString()
    const resetsAt = resetFromPayload !== null ? ctx.util.toIso(entry.nextResetTime) : fallback
    const opts = {
      label: "Tool calls",
      used: used,
      limit: limit,
      format: { kind: "count", suffix: "/ " + String(limit) },
      periodDurationMs: MONTH_MS,
    }
    if (resetsAt) opts.resetsAt = resetsAt
    return ctx.line.progress(opts)
  }

  function mapQuota(ctx, quota) {
    const container = quota.data && typeof quota.data === "object" ? quota.data : quota
    const limits = Array.isArray(container.limits) ? container.limits : Array.isArray(container) ? container : null
    if (!limits) throw "Usage response invalid. Try again later."
    if (limits.length === 0) return []

    const lines = []
    let sawRecognized = false
    for (let i = 0; i < limits.length; i++) {
      const type = limits[i].type || limits[i].name
      if (type !== "CREDIT_LIMIT" && type !== "TOKENS_LIMIT") continue
      const window = classifyTokenWindow(limits[i])
      if (!window) continue
      sawRecognized = true
      if (window.kind === "session") lines.push(percentLine(ctx, limits[i], "Session", window.periodMs))
      else lines.push(percentLine(ctx, limits[i], "Weekly", window.periodMs))
    }

    const timeLimit = findLimit(limits, "TIME_LIMIT")
    if (timeLimit) {
      sawRecognized = true
      lines.push(toolCallLine(ctx, timeLimit))
    }

    if (lines.length === 0 && sawRecognized) throw "Usage response invalid. Try again later."
    return lines
  }

  function probe(ctx) {
    const apiKey = loadApiKey(ctx)
    if (!apiKey) {
      throw "No ZAI_API_KEY found. Set up environment variable first."
    }

    const sub = fetchSubscription(ctx, apiKey)
    const plan = sub && sub.productName ? ctx.fmt.planLabel(sub.productName) : null

    const quota = fetchQuota(ctx, apiKey)
    if (isNoCodingPlan(quota)) {
      throw "No active GLM Coding Plan. The API key is valid but has no coding-plan quota."
    }

    const lines = mapQuota(ctx, quota)
    return { plan, lines, statuses: [peakStatus(ctx)] }
  }

  globalThis.__openquotacycle_plugin = { id: "zai", probe }
})()
