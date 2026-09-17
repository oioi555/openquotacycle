(function () {
  var LS_SERVICE = "exa.language_server_pb.LanguageServerService"
  var STATE_DBS = [
    "~/.config/Antigravity/User/globalStorage/state.vscdb",
    "~/.config/Antigravity IDE/User/globalStorage/state.vscdb",
  ]
  var OAUTH_TOPIC_KEY = "antigravityUnifiedStateSync.oauthToken"
  var OAUTH_TOPIC_ENTRY = "oauthTokenInfoSentinelKey"
  var LEGACY_TOKEN_KEY = "jetskiStateSync.agentManagerInitState"
  var AUTH_STATUS_KEY = "antigravityAuthStatus"
  var CLOUD_CODE_URLS = [
    "https://daily-cloudcode-pa.googleapis.com",
    "https://cloudcode-pa.googleapis.com",
  ]
  var QUOTA_SUMMARY_PATH = "/v1internal:retrieveUserQuotaSummary"
  var FETCH_MODELS_PATH = "/v1internal:fetchAvailableModels"
  var CC_MODEL_BLACKLIST = {
    "MODEL_CHAT_20706": true,
    "MODEL_CHAT_23310": true,
    "MODEL_GOOGLE_GEMINI_2_5_FLASH": true,
    "MODEL_GOOGLE_GEMINI_2_5_FLASH_THINKING": true,
    "MODEL_GOOGLE_GEMINI_2_5_FLASH_LITE": true,
    "MODEL_GOOGLE_GEMINI_2_5_PRO": true,
    "MODEL_PLACEHOLDER_M19": true,
    "MODEL_PLACEHOLDER_M9": true,
    "MODEL_PLACEHOLDER_M12": true,
  }
  // --- Protobuf wire-format decoder ---

  function readVarint(s, pos) {
    var v = 0
    var shift = 0
    while (pos < s.length) {
      var b = s.charCodeAt(pos++)
      v += (b & 0x7f) * Math.pow(2, shift)
      if ((b & 0x80) === 0) return { v: v, p: pos }
      shift += 7
    }
    return null
  }

  function readFields(s) {
    var fields = {}
    var pos = 0
    while (pos < s.length) {
      var tag = readVarint(s, pos)
      if (!tag) break
      pos = tag.p
      var fieldNum = Math.floor(tag.v / 8)
      var wireType = tag.v % 8
      if (wireType === 0) {
        var val = readVarint(s, pos)
        if (!val) break
        fields[fieldNum] = { type: 0, value: val.v }
        pos = val.p
      } else if (wireType === 2) {
        var len = readVarint(s, pos)
        if (!len) break
        pos = len.p
        fields[fieldNum] = { type: 2, data: s.substring(pos, pos + len.v) }
        pos += len.v
      } else {
        break
      }
    }
    return fields
  }

  function readLengthDelimitedFields(s, wantedFieldNum) {
    var values = []
    var pos = 0
    while (pos < s.length) {
      var tag = readVarint(s, pos)
      if (!tag) break
      pos = tag.p
      var fieldNum = Math.floor(tag.v / 8)
      var wireType = tag.v % 8
      if (wireType === 0) {
        var scalar = readVarint(s, pos)
        if (!scalar) break
        pos = scalar.p
      } else if (wireType === 2) {
        var len = readVarint(s, pos)
        if (!len) break
        pos = len.p
        var end = pos + len.v
        if (end > s.length) break
        if (fieldNum === wantedFieldNum) values.push(s.substring(pos, end))
        pos = end
      } else {
        break
      }
    }
    return values
  }

  // --- SQLite credential reading ---

  function readSqliteValue(ctx, dbPath, key) {
    try {
      var rows = ctx.host.sqlite.query(dbPath, "SELECT value FROM ItemTable WHERE key = '" + key + "' LIMIT 1")
      var parsed = ctx.util.tryParseJson(rows)
      if (!parsed || !parsed.length || !parsed[0].value) return null
      return parsed[0].value
    } catch (e) {
      ctx.host.log.warn("failed to read " + key + " from antigravity DB: " + String(e))
      return null
    }
  }

  function parseOAuthTokenInfo(raw) {
    var fields = readFields(raw)
    var accessToken = (fields[1] && fields[1].type === 2) ? fields[1].data : null
    var expirySeconds = null
    if (fields[4] && fields[4].type === 2) {
      var timestamp = readFields(fields[4].data)
      if (timestamp[1] && timestamp[1].type === 0) expirySeconds = timestamp[1].value
    }
    if (!accessToken) return null
    return { accessToken: accessToken, expirySeconds: expirySeconds }
  }

  function parseCurrentOAuthTokens(ctx, encoded) {
    try {
      var entries = readLengthDelimitedFields(ctx.base64.decode(encoded), 1)
      for (var i = 0; i < entries.length; i++) {
        var entry = readFields(entries[i])
        if (!entry[1] || entry[1].type !== 2 || entry[1].data !== OAUTH_TOPIC_ENTRY) continue
        if (!entry[2] || entry[2].type !== 2) continue
        var row = readFields(entry[2].data)
        if (!row[1] || row[1].type !== 2 || !row[1].data) continue
        var tokenInfo = parseOAuthTokenInfo(ctx.base64.decode(row[1].data))
        if (tokenInfo) return tokenInfo
      }
      return null
    } catch (e) {
      ctx.host.log.warn("failed to read current OAuth tokens from antigravity DB: " + String(e))
      return null
    }
  }

  function parseLegacyOAuthTokens(ctx, encoded) {
    try {
      var outer = readFields(ctx.base64.decode(encoded))
      if (!outer[6] || outer[6].type !== 2) return null
      return parseOAuthTokenInfo(outer[6].data)
    } catch (e) {
      ctx.host.log.warn("failed to read legacy OAuth tokens from antigravity DB: " + String(e))
      return null
    }
  }

  function isUsableToken(tokens) {
    if (!tokens || !tokens.accessToken) return false
    if (!tokens.expirySeconds) return true
    return tokens.expirySeconds > Math.floor(Date.now() / 1000)
  }

  function loadCredentials(ctx) {
    var fallbackApiKey = null
    var legacyCredentials = null
    var expiredAccessTokens = []

    function rememberExpiredToken(tokens) {
      if (!tokens || !tokens.accessToken || expiredAccessTokens.indexOf(tokens.accessToken) >= 0) return
      expiredAccessTokens.push(tokens.accessToken)
    }

    function credentials(apiKey, proto) {
      return { apiKey: apiKey, proto: proto, expiredAccessTokens: expiredAccessTokens }
    }

    // Prefer the current durable OAuth record across all profiles. This avoids
    // an empty/stale standalone database shadowing a logged-in IDE profile.
    for (var i = 0; i < STATE_DBS.length; i++) {
      var dbPath = STATE_DBS[i]
      var authJson = ctx.util.tryParseJson(readSqliteValue(ctx, dbPath, AUTH_STATUS_KEY))
      if (!fallbackApiKey && authJson && typeof authJson.apiKey === "string" && authJson.apiKey) {
        fallbackApiKey = authJson.apiKey
      }

      var currentEncoded = readSqliteValue(ctx, dbPath, OAUTH_TOPIC_KEY)
      var current = currentEncoded ? parseCurrentOAuthTokens(ctx, currentEncoded) : null
      if (isUsableToken(current)) {
        return credentials(current.accessToken, current)
      }
      if (current && current.accessToken) {
        rememberExpiredToken(current)
      }

      if (!legacyCredentials) {
        var legacyEncoded = readSqliteValue(ctx, dbPath, LEGACY_TOKEN_KEY)
        var legacy = legacyEncoded ? parseLegacyOAuthTokens(ctx, legacyEncoded) : null
        if (isUsableToken(legacy)) {
          legacyCredentials = {
            apiKey: (authJson && authJson.apiKey) || legacy.accessToken,
            proto: legacy,
          }
        } else if (legacy && legacy.accessToken) {
          rememberExpiredToken(legacy)
        }
      }
    }

    return legacyCredentials ? credentials(legacyCredentials.apiKey, legacyCredentials.proto) : credentials(fallbackApiKey, null)
  }

  // --- Token cache ---

  function loadCachedToken(ctx) {
    var path = ctx.app.pluginDataDir + "/auth.json"
    try {
      if (!ctx.host.fs.exists(path)) return null
      var data = ctx.util.tryParseJson(ctx.host.fs.readText(path))
      if (!data || !data.accessToken || !data.expiresAtMs) return null
      if (data.expiresAtMs <= Date.now()) return null
      return data.accessToken
    } catch (e) {
      ctx.host.log.warn("failed to read cached token: " + String(e))
      return null
    }
  }

  // --- agy keyring credential ---

  var AGY_KEYRING_SERVICE = "gemini"

  function parseExpiryMs(value) {
    if (typeof value !== "string" || !value) return null
    // Go RFC3339Nano expiry ("...08.187537917+09:00") — trim to milliseconds
    // because some JS engines reject >3 fraction digits.
    var trimmed = value.replace(/(\.\d{3})\d+/, "$1")
    var ms = Date.parse(trimmed)
    if (!Number.isFinite(ms)) ms = Date.parse(value)
    return Number.isFinite(ms) ? ms : null
  }

  // agy stores its OAuth tokens in the OS keyring (service `gemini`) and
  // refreshes them on every run, including the silent refresh in `agy -p`
  // print mode. Reading that entry (read-only) lets Cloud Code work right
  // after a boot or a starter run, when the IDE state databases still hold
  // expired tokens and no local server is alive. Only the access token is
  // used; the refresh token in the same entry is never read out, sent, or
  // persisted, and the plugin never writes keyring entries.
  function loadKeyringCredential(ctx) {
    try {
      if (!ctx.host.keychain || typeof ctx.host.keychain.readGenericPassword !== "function") return null
      var parsed = ctx.util.tryParseJson(ctx.host.keychain.readGenericPassword(AGY_KEYRING_SERVICE))
      var token = parsed && parsed.token
      var accessToken = token && typeof token.access_token === "string" ? token.access_token : null
      if (!accessToken) return null
      var expiryMs = parseExpiryMs(token.expiry)
      return { accessToken: accessToken, expirySeconds: expiryMs === null ? null : Math.floor(expiryMs / 1000) }
    } catch (e) {
      ctx.host.log.info("agy keyring credential not available: " + String(e))
      return null
    }
  }

  // --- Quota snapshot ---

  // Display-only cache of the last successful probe (labels, usage, reset
  // timestamps, plan — never tokens). After a reboot the stored access token
  // is usually expired and no local server is running; the snapshot lets the
  // plugin show the last known quota instead of an error. Antigravity/agy
  // still own credential renewal; this file must not hold any secret.
  function snapshotPath(ctx) {
    return ctx.app.pluginDataDir + "/quota-snapshot.json"
  }

  function saveSnapshot(ctx, result) {
    try {
      if (!result || !result.lines || result.lines.length === 0) return result
      ctx.host.fs.writeText(
        snapshotPath(ctx),
        JSON.stringify({
          savedAt: new Date().toISOString(),
          plan: result.plan || null,
          lines: result.lines,
        }),
      )
    } catch (e) {
      ctx.host.log.warn("failed to persist quota snapshot: " + String(e))
    }
    return result
  }

  function loadSnapshot(ctx) {
    var path = snapshotPath(ctx)
    try {
      if (!ctx.host.fs.exists(path)) return null
      var parsed = ctx.util.tryParseJson(ctx.host.fs.readText(path))
      if (!parsed || !Array.isArray(parsed.lines) || parsed.lines.length === 0) return null
      for (var i = 0; i < parsed.lines.length; i++) {
        var line = parsed.lines[i]
        if (!line || typeof line !== "object") return null
        if (line.type !== "progress" && line.type !== "text") return null
        if (typeof line.label !== "string" || !line.label) return null
        if (line.type === "progress") {
          if (typeof line.used !== "number" || !Number.isFinite(line.used)) return null
          if (typeof line.limit !== "number" || !Number.isFinite(line.limit) || line.limit <= 0) return null
          if (line.resetsAt !== undefined && line.resetsAt !== null && (typeof line.resetsAt !== "string" || !Number.isFinite(Date.parse(line.resetsAt)))) return null
          if (line.periodDurationMs !== undefined && line.periodDurationMs !== null && (typeof line.periodDurationMs !== "number" || !Number.isFinite(line.periodDurationMs) || line.periodDurationMs <= 0)) return null
        } else if (typeof line.value !== "string") {
          return null
        }
      }
      return { plan: typeof parsed.plan === "string" ? parsed.plan : null, lines: parsed.lines }
    } catch (e) {
      ctx.host.log.warn("failed to read quota snapshot: " + String(e))
      return null
    }
  }

  // --- LS discovery ---

  function discoverLs(ctx) {
    return ctx.host.ls.discover({
      processName: "language_server_linux",
      markers: ["antigravity", "antigravity-ide"],
      csrfFlag: "--csrf_token",
      portFlag: "--extension_server_port",
    })
  }

  function discoverAgy(ctx) {
    return ctx.host.ls.discover({
      processName: "agy",
      markers: [],
      csrfFlag: null,
      portFlag: null,
    })
  }

  function probePort(ctx, scheme, port, csrf) {
    var platform = (ctx.app && typeof ctx.app.platform === "string" && ctx.app.platform.trim()) || "linux"
    ctx.host.http.request({
      method: "POST",
      url: scheme + "://127.0.0.1:" + port + "/" + LS_SERVICE + "/GetUnleashData",
      headers: {
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
        "x-codeium-csrf-token": csrf,
      },
      bodyText: JSON.stringify({
        context: {
          properties: {
            devMode: "false",
            extensionVersion: "unknown",
            ide: "antigravity",
            ideVersion: "unknown",
            os: platform,
          },
        },
      }),
      timeoutMs: 5000,
      dangerouslyIgnoreTls: scheme === "https",
    })
    // Any HTTP response means this port is alive (even 400 validation errors).
    return true
  }

  function findWorkingPort(ctx, discovery) {
    var ports = discovery.ports || []
    for (var i = 0; i < ports.length; i++) {
      var port = ports[i]
      // Try HTTPS first (LS may use self-signed cert), then HTTP
      try { if (probePort(ctx, "https", port, discovery.csrf)) return { port: port, scheme: "https" } } catch (e) { /* ignore */ }
      try { if (probePort(ctx, "http", port, discovery.csrf)) return { port: port, scheme: "http" } } catch (e) { /* ignore */ }
      ctx.host.log.info("port " + port + " probe failed on both schemes")
    }
    if (discovery.extensionPort) return { port: discovery.extensionPort, scheme: "http" }
    return null
  }

  function callLs(ctx, port, scheme, csrf, method, body) {
    var resp = ctx.host.http.request({
      method: "POST",
      url: scheme + "://127.0.0.1:" + port + "/" + LS_SERVICE + "/" + method,
      headers: {
        "Content-Type": "application/json",
        "Connect-Protocol-Version": "1",
        "x-codeium-csrf-token": csrf,
      },
      bodyText: JSON.stringify(body || {}),
      timeoutMs: 10000,
      dangerouslyIgnoreTls: scheme === "https",
    })
    if (resp.status < 200 || resp.status >= 300) {
      ctx.host.log.warn("callLs " + method + " returned " + resp.status)
      return null
    }
    return ctx.util.tryParseJson(resp.bodyText)
  }

  // --- Line builders ---

  function normalizeLabel(label) {
    // "Gemini 3 Pro (High)" -> "Gemini 3 Pro"
    return label.replace(/\s*\([^)]*\)\s*$/, "").trim()
  }

  function poolLabel(normalizedLabel) {
    var lower = normalizedLabel.toLowerCase()
    if (lower.indexOf("gemini") !== -1) return "Session"
    // All non-Gemini models (Claude, GPT-OSS, etc.) share a single quota pool
    return "Claude"
  }

  function modelSortKey(label) {
    return label === "Session" ? "0_" + label : "1_" + label
  }

  var QUOTA_PERIOD_MS = 5 * 60 * 60 * 1000 // 5 hours
  var WEEKLY_PERIOD_MS = 7 * 24 * 60 * 60 * 1000
  var SUMMARY_BUCKETS = [
    { id: "gemini-5h", label: "Session", periodMs: QUOTA_PERIOD_MS },
    { id: "gemini-weekly", label: "Weekly", periodMs: WEEKLY_PERIOD_MS },
    { id: "3p-5h", label: "Claude", periodMs: QUOTA_PERIOD_MS },
    { id: "3p-weekly", label: "Claude Wk", periodMs: WEEKLY_PERIOD_MS },
  ]

  function modelLine(ctx, label, remainingFraction, resetTime, periodMs) {
    var clamped = Math.max(0, Math.min(1, remainingFraction))
    var used = Math.round((1 - clamped) * 100)
    var duration = periodMs || QUOTA_PERIOD_MS
    var opts = {
      label: label,
      used: used,
      limit: 100,
      format: { kind: "percent" },
      periodDurationMs: duration,
    }
    // A started 5-hour window can still round to used === 0 (agy/IDE show
    // ~100% remaining with "Refreshes in 4h"). Dropping resetTime made
    // Overview say Not started and blocked Window Starter confirmation.
    if (resetTime) opts.resetsAt = resetTime
    return ctx.line.progress(opts)
  }

  function parseQuotaSummary(ctx, data) {
    var groups = null
    if (data && data.response && Array.isArray(data.response.groups)) {
      groups = data.response.groups
    } else if (data && Array.isArray(data.groups)) {
      groups = data.groups
    }
    if (!groups) return null

    var pooled = {}
    var seenBuckets = {}
    for (var i = 0; i < groups.length; i++) {
      var buckets = groups[i] && Array.isArray(groups[i].buckets) ? groups[i].buckets : []
      for (var j = 0; j < buckets.length; j++) {
        var bucket = buckets[j]
        if (!bucket || typeof bucket !== "object") continue
        var spec = null
        for (var k = 0; k < SUMMARY_BUCKETS.length; k++) {
          if (SUMMARY_BUCKETS[k].id === bucket.bucketId) {
            spec = SUMMARY_BUCKETS[k]
            break
          }
        }
        if (!spec || seenBuckets[spec.id]) continue
        seenBuckets[spec.id] = true
        if (typeof bucket.remainingFraction !== "number" || !Number.isFinite(bucket.remainingFraction)) continue
        pooled[spec.id] = {
          label: spec.label,
          remainingFraction: bucket.remainingFraction,
          resetTime: bucket.resetTime || undefined,
          periodMs: spec.periodMs,
        }
      }
    }

    var lines = []
    for (var i = 0; i < SUMMARY_BUCKETS.length; i++) {
      var summary = pooled[SUMMARY_BUCKETS[i].id]
      if (!summary) continue
      lines.push(modelLine(ctx, summary.label, summary.remainingFraction, summary.resetTime, summary.periodMs))
    }
    return lines
  }

  function buildModelLines(ctx, configs) {
    var deduped = {}
    for (var i = 0; i < configs.length; i++) {
      var c = configs[i]
      var label = (typeof c.label === "string") ? c.label.trim() : ""
      if (!label) continue
      var qi = c.quotaInfo
      var frac = (qi && typeof qi.remainingFraction === "number") ? qi.remainingFraction : 0
      var rtime = (qi && qi.resetTime) || undefined
      var pool = poolLabel(normalizeLabel(label))
      if (!deduped[pool] || frac < deduped[pool].remainingFraction) {
        deduped[pool] = {
          label: pool,
          remainingFraction: frac,
          resetTime: rtime,
        }
      }
    }

    var models = []
    var keys = Object.keys(deduped)
    for (var i = 0; i < keys.length; i++) {
      var m = deduped[keys[i]]
      m.sortKey = modelSortKey(m.label)
      models.push(m)
    }

    models.sort(function (a, b) {
      return a.sortKey < b.sortKey ? -1 : a.sortKey > b.sortKey ? 1 : 0
    })

    var lines = []
    for (var i = 0; i < models.length; i++) {
      lines.push(modelLine(ctx, models[i].label, models[i].remainingFraction, models[i].resetTime, QUOTA_PERIOD_MS))
    }
    return lines
  }

  // --- Cloud Code API ---

  function probeCloudCodeSummary(ctx, token) {
    for (var i = 0; i < CLOUD_CODE_URLS.length; i++) {
      try {
        var resp = ctx.host.http.request({
          method: "POST",
          url: CLOUD_CODE_URLS[i] + QUOTA_SUMMARY_PATH,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
            "User-Agent": "antigravity",
          },
          bodyText: "{}",
          timeoutMs: 15000,
        })
        if (ctx.util.isAuthStatus(resp.status)) return { _authFailed: true }
        if (resp.status >= 200 && resp.status < 300) {
          var data = ctx.util.tryParseJson(resp.bodyText)
          var lines = parseQuotaSummary(ctx, data)
          if (lines !== null) return { _summary: true, lines: lines }
        }
      } catch (e) {
        ctx.host.log.warn("Cloud Code quota summary failed (" + CLOUD_CODE_URLS[i] + "): " + String(e))
      }
    }
    return null
  }

  function probeCloudCode(ctx, token) {
    var summary = probeCloudCodeSummary(ctx, token)
    if (summary) return summary

    for (var i = 0; i < CLOUD_CODE_URLS.length; i++) {
      try {
        var resp = ctx.host.http.request({
          method: "POST",
          url: CLOUD_CODE_URLS[i] + FETCH_MODELS_PATH,
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer " + token,
            "User-Agent": "antigravity",
          },
          bodyText: "{}",
          timeoutMs: 15000,
        })
        if (ctx.util.isAuthStatus(resp.status)) return { _authFailed: true }
        if (resp.status >= 200 && resp.status < 300) {
          return ctx.util.tryParseJson(resp.bodyText)
        }
      } catch (e) {
        ctx.host.log.warn("Cloud Code request failed (" + CLOUD_CODE_URLS[i] + "): " + String(e))
      }
    }
    return null
  }

  function parseCloudCodeModels(data) {
    var modelsObj = data && data.models
    if (!modelsObj || typeof modelsObj !== "object") return []
    var keys = Object.keys(modelsObj)
    var configs = []
    for (var i = 0; i < keys.length; i++) {
      var m = modelsObj[keys[i]]
      if (!m || typeof m !== "object") continue
      if (m.isInternal) continue
      var modelId = m.model || keys[i]
      if (CC_MODEL_BLACKLIST[modelId]) continue
      var displayName = (typeof m.displayName === "string") ? m.displayName.trim() : ""
      if (!displayName) continue
      var qi = m.quotaInfo
      var frac = (qi && typeof qi.remainingFraction === "number") ? qi.remainingFraction : 0
      var rtime = (qi && qi.resetTime) || undefined
      configs.push({
        label: displayName,
        quotaInfo: { remainingFraction: frac, resetTime: rtime },
      })
    }
    return configs
  }

  // --- LS probe ---

  function probeLs(ctx, apiKey) {
    var result = probeLsDiscovery(ctx, discoverLs(ctx), apiKey)
    if (result) return result
    return probeLsDiscovery(ctx, discoverAgy(ctx), apiKey)
  }

  function probeLsDiscovery(ctx, discovery, apiKey) {
    if (!discovery) return null

    var found = findWorkingPort(ctx, discovery)
    if (!found) return null

    ctx.host.log.info("using LS at " + found.scheme + "://127.0.0.1:" + found.port)

    var metadata = {
      ideName: "antigravity",
      extensionName: "antigravity",
      ideVersion: "unknown",
      locale: "en",
    }
    if (apiKey) metadata.apiKey = apiKey

    // Prefer the authoritative summary: it contains merged Gemini/non-Gemini
    // pools and both rolling five-hour and weekly windows.
    var summaryData = null
    try {
      summaryData = callLs(ctx, found.port, found.scheme, discovery.csrf, "RetrieveUserQuotaSummary", { metadata: metadata })
    } catch (e) {
      ctx.host.log.warn("RetrieveUserQuotaSummary threw: " + String(e))
    }
    var summaryLines = parseQuotaSummary(ctx, summaryData)
    if (summaryLines !== null) {
      var summaryStatus = null
      try {
        summaryStatus = callLs(ctx, found.port, found.scheme, discovery.csrf, "GetUserStatus", { metadata: metadata })
      } catch (e) {
        ctx.host.log.warn("GetUserStatus after quota summary threw: " + String(e))
      }
      var summaryPlan = null
      if (summaryStatus && summaryStatus.userStatus) {
        var summaryTier = summaryStatus.userStatus.userTier
        var summaryTierName =
          summaryTier && typeof summaryTier.name === "string" && summaryTier.name.trim() ? summaryTier.name.trim() : null
        if (summaryTierName) {
          summaryPlan = summaryTierName
        } else {
          var summaryPlanStatus = summaryStatus.userStatus.planStatus || {}
          var summaryPlanInfo = summaryPlanStatus.planInfo || {}
          summaryPlan =
            typeof summaryPlanInfo.planName === "string" && summaryPlanInfo.planName.trim() ? summaryPlanInfo.planName.trim() : null
        }
      }
      return { plan: summaryPlan, lines: summaryLines }
    }

    // Fall back to legacy GetUserStatus and GetCommandModelConfigs.
    var data = null
    try {
      data = callLs(ctx, found.port, found.scheme, discovery.csrf, "GetUserStatus", { metadata: metadata })
    } catch (e) {
      ctx.host.log.warn("GetUserStatus threw: " + String(e))
    }
    var hasUserStatus = data && data.userStatus

    if (!hasUserStatus) {
      ctx.host.log.warn("GetUserStatus failed, trying GetCommandModelConfigs")
      data = callLs(ctx, found.port, found.scheme, discovery.csrf, "GetCommandModelConfigs", { metadata: metadata })
    }

    // Parse model configs
    var configs
    if (hasUserStatus) {
      configs = (data.userStatus.cascadeModelConfigData || {}).clientModelConfigs || []
    } else if (data && data.clientModelConfigs) {
      configs = data.clientModelConfigs
    } else {
      return null
    }

    var filtered = []
    for (var j = 0; j < configs.length; j++) {
      var mid = configs[j].modelOrAlias && configs[j].modelOrAlias.model
      if (mid && CC_MODEL_BLACKLIST[mid]) continue
      filtered.push(configs[j])
    }

    var lines = buildModelLines(ctx, filtered)
    if (lines.length === 0) return null

    var plan = null
    if (hasUserStatus) {
      // Prefer userTier.name (Google's own subscription system) over the legacy
      // planInfo.planName field inherited from Windsurf/Codeium, which always
      // returns "Pro" for all paid tiers including Google AI Ultra.
      var ut = data.userStatus.userTier
      var userTierName =
        ut && typeof ut.name === "string" && ut.name.trim() ? ut.name.trim() : null
      if (userTierName) {
        plan = userTierName
      } else {
        var ps = data.userStatus.planStatus || {}
        var pi = ps.planInfo || {}
        plan =
          typeof pi.planName === "string" && pi.planName.trim() ? pi.planName.trim() : null
      }
    }

    return { plan: plan, lines: lines }
  }

  // --- Probe ---

  function dayKeyFromMs(ms) {
    var d = new Date(ms)
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0")
  }

  function fmtSpend(tokens, cost) {
    if (cost != null && Number.isFinite(cost)) {
      return "$" + cost.toFixed(2) + " · " + String(tokens) + " tokens"
    }
    return String(tokens) + " tokens"
  }

  function appendConversationSpend(ctx, lines) {
    try {
      var dir = "~/.gemini/antigravity-cli/conversations"
      if (!ctx.host.fs.exists(dir)) return
      var names = ctx.host.fs.listDir(dir) || []
      var now = new Date()
      var cutoffMs = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 29 * 24 * 60 * 60 * 1000
      var cutoff = dayKeyFromMs(cutoffMs)
      var totals = {}
      var sql = "SELECT time_created AS ms, tokens, cost FROM generations WHERE tokens IS NOT NULL AND time_created >= " + String(cutoffMs)
      for (var i = 0; i < names.length; i++) {
        if (!/\.db$/.test(names[i])) continue
        var rows
        try {
          rows = ctx.util.tryParseJson(ctx.host.sqlite.query(dir + "/" + names[i], sql))
        } catch (e) {
          ctx.host.log.warn("antigravity conversation db skipped: " + String(e))
          continue
        }
        if (!Array.isArray(rows)) continue
        for (var j = 0; j < rows.length; j++) {
          var row = rows[j]
          if (!row || typeof row !== "object") continue
          var ms = Number(row.ms)
          var tokens = Number(row.tokens)
          if (!Number.isFinite(ms) || !Number.isFinite(tokens) || tokens < 0) continue
          var key = dayKeyFromMs(ms)
          if (key < cutoff) continue
          if (!totals[key]) totals[key] = { tokens: 0, cost: 0, hasCost: false }
          totals[key].tokens += tokens
          var cost = Number(row.cost)
          if (Number.isFinite(cost) && cost >= 0) {
            totals[key].cost += cost
            totals[key].hasCost = true
          }
        }
      }
      var today = dayKeyFromMs(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()))
      var yesterday = dayKeyFromMs(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1))
      if (totals[today]) {
        lines.push(ctx.line.text({
          label: "Today",
          value: fmtSpend(totals[today].tokens, totals[today].hasCost ? totals[today].cost : null),
        }))
      }
      if (totals[yesterday]) {
        lines.push(ctx.line.text({
          label: "Yesterday",
          value: fmtSpend(totals[yesterday].tokens, totals[yesterday].hasCost ? totals[yesterday].cost : null),
        }))
      }
      var keys = Object.keys(totals)
      var tokenSum = 0
      var costSum = 0
      var hasCost = false
      for (var k = 0; k < keys.length; k++) {
        if (keys[k] < cutoff) continue
        tokenSum += totals[keys[k]].tokens
        if (totals[keys[k]].hasCost) {
          costSum += totals[keys[k]].cost
          hasCost = true
        }
      }
      if (tokenSum > 0) {
        lines.push(ctx.line.text({
          label: "Last 30 Days",
          value: fmtSpend(tokenSum, hasCost ? costSum : null),
        }))
      }
    } catch (e) {
      ctx.host.log.warn("antigravity conversation spend skipped: " + String(e))
    }
  }

  function withSpend(ctx, result) {
    if (!result || !result.lines) return result
    appendConversationSpend(ctx, result.lines)
    return result
  }

  function probe(ctx) {
    try {
      return probeFresh(ctx)
    } catch (e) {
      var snapshot = loadSnapshot(ctx)
      if (snapshot) {
        ctx.host.log.warn("probe failed, showing stale quota: " + String(e))
        var lines = snapshot.lines.slice()
        appendConversationSpend(ctx, lines)
        return {
          plan: snapshot.plan,
          lines: lines,
          statuses: [ctx.status.chip({ text: "Stale", tone: "warning" })],
          error: String(e),
        }
      }
      throw e
    }
  }

  function probeFresh(ctx) {
    var credentials = loadCredentials(ctx)
    var proto = credentials.proto
    var expiredAccessTokens = credentials.expiredAccessTokens || []

    function isExpiredAccessToken(token) {
      return !!token && expiredAccessTokens.indexOf(token) >= 0
    }

    var apiKey = isExpiredAccessToken(credentials.apiKey) ? null : credentials.apiKey

    var lsResult = probeLs(ctx, apiKey)
    if (lsResult) return withSpend(ctx, saveSnapshot(ctx, lsResult))

    var tokens = []
    function pushToken(token) {
      if (!token || tokens.indexOf(token) >= 0) return
      tokens.push(token)
    }

    if (proto && proto.accessToken) {
      if (!isExpiredAccessToken(proto.accessToken) && (!proto.expirySeconds || proto.expirySeconds > Math.floor(Date.now() / 1000))) {
        pushToken(proto.accessToken)
      }
    }

    var cached = loadCachedToken(ctx)
    if (cached && !isExpiredAccessToken(cached)) pushToken(cached)

    var keyring = loadKeyringCredential(ctx)
    if (
      keyring &&
      (!keyring.expirySeconds || keyring.expirySeconds > Math.floor(Date.now() / 1000))
    ) {
      // Keyring expiry wins over a profile copy of the same access token.
      // rememberExpiredToken() would otherwise drop the only live bearer.
      pushToken(keyring.accessToken)
    }

    if (apiKey && !isExpiredAccessToken(apiKey)) pushToken(apiKey)

    if (tokens.length === 0) throw "Antigravity session expired. Start Antigravity or agy and try again."

    var ccData = null
    for (var i = 0; i < tokens.length; i++) {
      ccData = probeCloudCode(ctx, tokens[i])
      if (ccData && !ccData._authFailed) break
      ccData = null
    }

    if (ccData && !ccData._authFailed) {
      if (ccData._summary) return withSpend(ctx, saveSnapshot(ctx, { plan: null, lines: ccData.lines }))
      var configs = parseCloudCodeModels(ccData)
      var lines = buildModelLines(ctx, configs)
      if (lines.length > 0) return withSpend(ctx, saveSnapshot(ctx, { plan: null, lines: lines }))
    }

    throw "Antigravity session expired. Start Antigravity or agy and try again."
  }

  globalThis.__openquotacycle_plugin = { id: "antigravity", probe: probe }
})()
