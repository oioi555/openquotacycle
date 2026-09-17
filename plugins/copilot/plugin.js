(function () {
  const KEYCHAIN_SERVICE = "Quotracker-copilot"
  const GH_KEYCHAIN_SERVICE = "gh:github.com"
  const EDITOR_APPS = "~/.config/github-copilot/apps.json"
  const EDITOR_HOSTS = "~/.config/github-copilot/hosts.json"
  const GH_HOSTS = "~/.config/gh/hosts.yml"
  const USAGE_URL = "https://api.github.com/copilot_internal/user"
  const USER_ORGS_URL = "https://api.github.com/user/orgs?per_page=100"
  const PERIOD_MS = 30 * 24 * 60 * 60 * 1000
  const MISSING_TOKEN = "Not signed in. Sign in to Copilot in an editor or run `gh auth login`."

  function readJson(ctx, path) {
    try {
      if (!ctx.host.fs.exists(path)) return null
      return ctx.util.tryParseJson(ctx.host.fs.readText(path))
    } catch (e) {
      ctx.host.log.warn("readJson failed for " + path + ": " + String(e))
      return null
    }
  }

  function writeJson(ctx, path, value) {
    try {
      ctx.host.fs.writeText(path, JSON.stringify(value))
    } catch (e) {
      ctx.host.log.warn("writeJson failed for " + path + ": " + String(e))
    }
  }

  function saveToken(ctx, token) {
    try {
      ctx.host.keychain.writeGenericPassword(KEYCHAIN_SERVICE, JSON.stringify({ token: token }))
    } catch (e) {
      ctx.host.log.warn("keychain write failed: " + String(e))
    }
    writeJson(ctx, ctx.app.pluginDataDir + "/auth.json", { token: token })
  }

  function readNumber(value) {
    if (value === null || value === undefined || value === "") return null
    const n = Number(value)
    return Number.isFinite(n) ? n : null
  }

  function clampPercent(value) {
    return Math.min(100, Math.max(0, value))
  }

  function oauthTokenFromEditor(object) {
    if (!object || typeof object !== "object") return null
    const keys = Object.keys(object)
    for (let i = 0; i < keys.length; i++) {
      const key = keys[i]
      if (key !== "github.com" && key.indexOf("github.com:") !== 0) continue
      const entry = object[key]
      const token = entry && typeof entry.oauth_token === "string" ? entry.oauth_token.trim() : ""
      if (token) return token
    }
    return null
  }

  function yamlValue(text, key, host) {
    const prefix = key + ":"
    const hostHeader = (host || "github.com") + ":"
    const lines = String(text).split(/\r?\n/)
    let inHost = false
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.length && !/\s/.test(line.charAt(0))) {
        inHost = line.trim().indexOf(hostHeader) === 0
        continue
      }
      if (!inHost) continue
      const trimmed = line.trim()
      if (trimmed.indexOf(prefix) !== 0) continue
      let value = trimmed.slice(prefix.length).trim()
      if (
        (value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') ||
        (value.charAt(0) === "'" && value.charAt(value.length - 1) === "'")
      ) {
        value = value.slice(1, -1)
      }
      return value || null
    }
    return null
  }

  function loadFromEditor(ctx) {
    const paths = [EDITOR_APPS, EDITOR_HOSTS]
    for (let i = 0; i < paths.length; i++) {
      const token = oauthTokenFromEditor(readJson(ctx, paths[i]))
      if (token) return { token: token, source: "editor" }
    }
    return null
  }

  function loadFromGhHosts(ctx) {
    try {
      if (!ctx.host.fs.exists(GH_HOSTS)) return null
      const token = yamlValue(ctx.host.fs.readText(GH_HOSTS), "oauth_token", "github.com")
      if (token) return { token: token, source: "gh-file" }
    } catch (e) {
      ctx.host.log.info("gh hosts.yml read failed: " + String(e))
    }
    return null
  }

  function unwrapGoKeyring(ctx, raw) {
    let token = raw
    if (typeof token === "string" && token.indexOf("go-keyring-base64:") === 0) {
      token = ctx.base64.decode(token.slice("go-keyring-base64:".length))
    }
    return token && String(token).trim() ? String(token).trim() : null
  }

  function loadFromGhKeychain(ctx) {
    try {
      const raw = ctx.host.keychain.readGenericPassword(GH_KEYCHAIN_SERVICE)
      const token = unwrapGoKeyring(ctx, raw)
      if (token) return { token: token, source: "gh-cli" }
    } catch (e) {
      ctx.host.log.info("gh CLI keychain read failed: " + String(e))
    }
    return null
  }

  function loadCachedToken(ctx) {
    try {
      const raw = ctx.host.keychain.readGenericPassword(KEYCHAIN_SERVICE)
      if (raw) {
        const parsed = ctx.util.tryParseJson(raw)
        if (parsed && parsed.token) return { token: parsed.token, source: "keychain" }
      }
    } catch (e) {
      ctx.host.log.info("app keychain read failed: " + String(e))
    }
    const data = readJson(ctx, ctx.app.pluginDataDir + "/auth.json")
    if (data && data.token) return { token: data.token, source: "state" }
    return null
  }

  function loadToken(ctx) {
    return loadFromEditor(ctx) || loadFromGhHosts(ctx) || loadFromGhKeychain(ctx) || loadCachedToken(ctx)
  }

  function usageHeaders(token) {
    return {
      Authorization: "token " + token,
      Accept: "application/json",
      "Editor-Version": "vscode/1.96.2",
      "Editor-Plugin-Version": "copilot-chat/0.26.7",
      "User-Agent": "GitHubCopilotChat/0.26.7",
      "X-Github-Api-Version": "2025-04-01",
    }
  }

  function fetchUsage(ctx, token) {
    return ctx.util.request({
      method: "GET",
      url: USAGE_URL,
      headers: usageHeaders(token),
      timeoutMs: 10000,
    })
  }

  function snapshotLine(ctx, label, snapshot, resetDate) {
    if (!snapshot || typeof snapshot !== "object") return null
    const entitlement = readNumber(snapshot.entitlement)
    const remaining = readNumber(snapshot.remaining)
    if (snapshot.unlimited === true || entitlement === -1 || remaining === -1) return null
    if (entitlement === 0) return null

    let usedPercent = null
    const percentRemaining = readNumber(snapshot.percent_remaining)
    if (percentRemaining !== null) {
      usedPercent = clampPercent(100 - percentRemaining)
    } else if (entitlement !== null && entitlement > 0 && remaining !== null) {
      usedPercent = clampPercent(100 - (remaining / entitlement) * 100)
    } else {
      return null
    }

    return ctx.line.progress({
      label: label,
      used: usedPercent,
      limit: 100,
      format: { kind: "percent" },
      resetsAt: ctx.util.toIso(resetDate),
      periodDurationMs: PERIOD_MS,
    })
  }

  function overageLine(ctx, snapshot) {
    if (!snapshot || snapshot.overage_permitted !== true) return null
    const overage = Math.max(0, readNumber(snapshot.overage_count) || 0)
    return ctx.line.text({ label: "Extra Usage", value: String(overage) })
  }

  function limitedCountLine(ctx, label, remaining, total, resetDate) {
    const limit = readNumber(total)
    const left = readNumber(remaining)
    if (limit === null || limit <= 0 || left === null) return null
    const used = Math.max(0, limit - left)
    return ctx.line.progress({
      label: label,
      used: used,
      limit: limit,
      format: { kind: "count", suffix: "/ " + String(limit) },
      resetsAt: ctx.util.toIso(resetDate),
      periodDurationMs: PERIOD_MS,
    })
  }

  function personalCreditsLine(ctx, snapshot) {
    if (!snapshot || typeof snapshot !== "object") return null
    const creditsUsed = readNumber(snapshot.credits_used)
    if (creditsUsed === null || creditsUsed <= 0) return null
    return ctx.line.text({ label: "Credits", value: String(creditsUsed) })
  }

  function orgSummaryUrl(org) {
    return "https://api.github.com/orgs/" + encodeURIComponent(org) + "/settings/billing/usage/summary"
  }

  function orgLogins(body) {
    if (!Array.isArray(body)) return []
    const out = []
    for (let i = 0; i < body.length; i++) {
      const login = body[i] && typeof body[i].login === "string" ? body[i].login.trim() : ""
      if (login) out.push(login)
    }
    return out
  }

  function orgUsageLines(ctx, body) {
    if (!body || !Array.isArray(body.usageItems)) return null
    const items = body.usageItems.filter(function (item) {
      const product = String(item.product || "").trim().toLowerCase()
      const unit = String(item.unitType || "").trim().toLowerCase()
      return product === "copilot" && (unit === "ai-units" || unit === "ai-credits")
    })
    if (items.length === 0) return null
    let credits = 0
    let spend = 0
    for (let i = 0; i < items.length; i++) {
      credits += Math.max(0, readNumber(items[i].grossQuantity) || 0)
      spend += Math.max(0, readNumber(items[i].netAmount) || 0)
    }
    return [
      ctx.line.text({ label: "Org Credits", value: String(credits) + " credits" }),
      ctx.line.text({ label: "Org Spend", value: "$" + (Math.round(spend * 100) / 100).toFixed(2) }),
    ]
  }

  function fetchJson(ctx, token, url) {
    return ctx.util.request({
      method: "GET",
      url: url,
      headers: {
        Authorization: "token " + token,
        Accept: "application/vnd.github+json",
        "User-Agent": "OpenQuotaCycle",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      timeoutMs: 15000,
    })
  }

  function orgBillingLines(ctx, token) {
    try {
      const orgsResp = fetchJson(ctx, token, USER_ORGS_URL)
      if (orgsResp.status !== 200) return []
      const orgs = orgLogins(ctx.util.tryParseJson(orgsResp.bodyText))
      for (let i = 0; i < orgs.length; i++) {
        try {
          const summary = fetchJson(ctx, token, orgSummaryUrl(orgs[i]))
          if (summary.status !== 200) continue
          const lines = orgUsageLines(ctx, ctx.util.tryParseJson(summary.bodyText))
          if (lines && lines.length) return lines
        } catch (e) {
          ctx.host.log.warn("org billing summary failed: " + String(e))
        }
      }
    } catch (e) {
      ctx.host.log.info("org billing lookup skipped: " + String(e))
    }
    return []
  }

  function mapUsage(ctx, data) {
    const plan = data.copilot_plan ? ctx.fmt.planLabel(data.copilot_plan) : null
    const resetDate = data.quota_reset_date || data.limited_user_reset_date
    const snapshots = data.quota_snapshots || null
    const premium = snapshots ? snapshots.premium_interactions : null
    const lines = []
    const credits = snapshotLine(ctx, "Credits", premium, resetDate)
    if (credits) {
      lines.push(credits)
      const extra = overageLine(ctx, premium)
      if (extra) lines.push(extra)
    }
    const chat = snapshotLine(ctx, "Chat", snapshots ? snapshots.chat : null, resetDate)
    const completions = snapshotLine(ctx, "Completions", snapshots ? snapshots.completions : null, resetDate)
    if (chat) lines.push(chat)
    if (completions) lines.push(completions)

    if (lines.length === 0) {
      const limited = data.limited_user_quotas
      const monthly = data.monthly_quotas
      if (limited && monthly) {
        const limitedChat = limitedCountLine(ctx, "Chat", limited.chat, monthly.chat, resetDate)
        const limitedCompletions = limitedCountLine(
          ctx,
          "Completions",
          limited.completions,
          monthly.completions,
          resetDate,
        )
        if (limitedChat) lines.push(limitedChat)
        if (limitedCompletions) lines.push(limitedCompletions)
      }
    }

    const orgManaged = data.token_based_billing === true
    if (lines.length === 0) {
      if (!orgManaged) return { plan: plan, lines: lines, orgManaged: false }
      const personal = personalCreditsLine(ctx, premium)
      if (personal) lines.push(personal)
      return { plan: plan, lines: lines, orgManaged: true }
    }
    return { plan: plan, lines: lines, orgManaged: orgManaged }
  }

  function probe(ctx) {
    const cred = loadToken(ctx)
    if (!cred) throw MISSING_TOKEN

    let resp
    try {
      resp = fetchUsage(ctx, cred.token)
    } catch (e) {
      ctx.host.log.error("usage request exception: " + String(e))
      throw "Usage request failed. Check your connection."
    }

    if (resp.status === 401 || resp.status === 403) {
      throw "Token invalid. Run `gh auth login` to re-authenticate."
    }
    if (resp.status < 200 || resp.status >= 300) {
      throw "Usage request failed (HTTP " + String(resp.status) + "). Try again later."
    }

    if (cred.source === "gh-cli" || cred.source === "gh-file") saveToken(ctx, cred.token)

    const data = ctx.util.tryParseJson(resp.bodyText)
    if (data === null) throw "Usage response invalid. Try again later."

    const mapped = mapUsage(ctx, data)
    if (mapped.orgManaged) {
      const orgLines = orgBillingLines(ctx, cred.token)
      for (let i = 0; i < orgLines.length; i++) mapped.lines.push(orgLines[i])
    }

    return { plan: mapped.plan, lines: mapped.lines }
  }

  globalThis.__openquotacycle_plugin = { id: "copilot", probe }
})()
