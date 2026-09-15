(function () {
  const PROVIDER_ID = "openrouter"
  const CONFIG_PATH = "~/.config/quotracker/openrouter.json"
  const AUTH_PATH = "~/.local/share/opencode/auth.json"
  const KEY_URL = "https://openrouter.ai/api/v1/key"
  const CREDITS_URL = "https://openrouter.ai/api/v1/credits"
  const USER_AGENT = "Quotracker"

  function readNumber(value) {
    if (value === null || value === undefined || value === "") return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  function formatUsd(value) {
    const n = Number(value)
    if (!Number.isFinite(n)) return "$0.00"
    return "$" + (Math.round(n * 100) / 100).toFixed(2)
  }

  function readKeyString(value) {
    return typeof value === "string" && value.trim() ? value.trim() : null
  }

  function loadConfigKey(ctx) {
    if (!ctx.host.fs.exists(CONFIG_PATH)) return null
    try {
      const parsed = ctx.util.tryParseJson(ctx.host.fs.readText(CONFIG_PATH))
      if (!parsed || typeof parsed !== "object") return null
      return readKeyString(parsed.apiKey) || readKeyString(parsed.api_key) || readKeyString(parsed.key)
    } catch (e) {
      ctx.host.log.warn("openrouter config read failed: " + String(e))
      return null
    }
  }

  function loadEnvKey(ctx) {
    return readKeyString(ctx.host.env.get("OPENROUTER_API_KEY"))
  }

  function loadOpenCodeKey(ctx) {
    if (!ctx.host.fs.exists(AUTH_PATH)) return null
    try {
      const parsed = ctx.util.tryParseJson(ctx.host.fs.readText(AUTH_PATH))
      if (!parsed || typeof parsed !== "object") return null
      const entry = parsed[PROVIDER_ID]
      if (!entry || typeof entry !== "object") return null
      return readKeyString(entry.key)
    } catch (e) {
      ctx.host.log.warn("opencode auth read failed: " + String(e))
      return null
    }
  }

  function loadApiKey(ctx) {
    return loadConfigKey(ctx) || loadEnvKey(ctx) || loadOpenCodeKey(ctx)
  }

  function fetchJson(ctx, apiKey, url) {
    return ctx.util.request({
      method: "GET",
      url: url,
      headers: {
        Authorization: "Bearer " + apiKey,
        Accept: "application/json",
        "User-Agent": USER_AGENT,
      },
      timeoutMs: 10000,
    })
  }

  function dataObject(body) {
    if (!body || typeof body !== "object" || !body.data || typeof body.data !== "object") return null
    return body.data
  }

  function loadEndpoint(ctx, apiKey, url) {
    try {
      const resp = fetchJson(ctx, apiKey, url)
      if (ctx.util.isAuthStatus(resp.status)) return { kind: "auth" }
      if (resp.status < 200 || resp.status >= 300) return { kind: "failed", status: resp.status }
      const parsed = ctx.util.tryParseJson(resp.bodyText)
      const data = dataObject(parsed)
      if (!data) return { kind: "invalid" }
      return { kind: "ok", data: data }
    } catch (e) {
      ctx.host.log.error("openrouter request exception: " + String(e))
      return { kind: "connection" }
    }
  }

  function creditsLines(ctx, data) {
    const totalUsage = readNumber(data.total_usage)
    if (totalUsage === null || totalUsage < 0) return null
    const totalCredits = Math.max(0, readNumber(data.total_credits) || 0)
    const used = Math.max(0, totalUsage)
    const lines = []
    if (totalCredits > 0) {
      lines.push(
        ctx.line.progress({
          label: "Credits",
          used: used,
          limit: totalCredits,
          format: { kind: "dollars" },
        }),
      )
    }
    lines.push(ctx.line.text({ label: "Balance", value: formatUsd(Math.max(0, totalCredits - used)) }))
    return lines
  }

  function spendLine(ctx, label, value) {
    const amount = readNumber(value)
    if (amount === null || amount < 0) return null
    return ctx.line.text({ label: label, value: formatUsd(Math.max(0, amount)) })
  }

  function keyMetrics(ctx, data) {
    const lines = []
    const today = spendLine(ctx, "Today", data.usage_daily)
    const weekly = spendLine(ctx, "Weekly", data.usage_weekly)
    const monthly = spendLine(ctx, "Monthly", data.usage_monthly)
    if (today) lines.push(today)
    if (weekly) lines.push(weekly)
    if (monthly) lines.push(monthly)

    if (data.limit !== null && data.limit !== undefined) {
      const limit = readNumber(data.limit)
      if (limit === null || limit < 0) return { error: true }
      if (limit > 0) {
        let remaining
        if (data.limit_remaining === null || data.limit_remaining === undefined) {
          const usage = readNumber(data.usage)
          if (usage === null || usage < 0) return { error: true }
          remaining = limit - usage
        } else {
          remaining = readNumber(data.limit_remaining)
          if (remaining === null) return { error: true }
        }
        if (remaining < 0 || remaining > limit) return { error: true }
        lines.push(
          ctx.line.progress({
            label: "Key Limit",
            used: Math.max(0, limit - remaining),
            limit: limit,
            format: { kind: "dollars" },
            resetsAt: ctx.util.toIso(data.limit_reset),
          }),
        )
      }
    }

    const plan = typeof data.is_free_tier === "boolean" ? (data.is_free_tier ? "Free tier" : "Pay as you go") : undefined
    return { plan: plan, lines: lines }
  }

  function probe(ctx) {
    const apiKey = loadApiKey(ctx)
    if (!apiKey) {
      throw "No OpenRouter API key. Set OPENROUTER_API_KEY or add it to ~/.config/quotracker/openrouter.json."
    }

    const credits = loadEndpoint(ctx, apiKey, CREDITS_URL)
    const key = loadEndpoint(ctx, apiKey, KEY_URL)

    const lines = []
    let plan
    if (credits.kind === "ok") {
      const creditLines = creditsLines(ctx, credits.data)
      if (creditLines) {
        for (let i = 0; i < creditLines.length; i++) lines.push(creditLines[i])
      }
    }
    if (key.kind === "ok") {
      const mapped = keyMetrics(ctx, key.data)
      if (mapped.error) {
        if (lines.length === 0) throw "OpenRouter response invalid. Try again later."
      } else {
        plan = mapped.plan
        for (let i = 0; i < mapped.lines.length; i++) lines.push(mapped.lines[i])
      }
    }

    if (lines.length > 0) return { plan: plan, lines: lines }

    if (credits.kind === "auth" && key.kind === "auth") {
      throw "OpenRouter API key invalid. Update the key and try again."
    }
    if (credits.kind === "connection" || key.kind === "connection") {
      throw "Usage request failed. Check your connection."
    }
    if (credits.kind === "failed") {
      throw "Usage request failed (HTTP " + String(credits.status) + "). Try again later."
    }
    if (key.kind === "failed") {
      throw "Usage request failed (HTTP " + String(key.status) + "). Try again later."
    }
    throw "OpenRouter response invalid. Try again later."
  }

  globalThis.__quotracker_plugin = { id: PROVIDER_ID, probe }
})()
