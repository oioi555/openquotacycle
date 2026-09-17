(function () {
  const PROVIDER_ID = "grok";
  const AUTH_PATH = "~/.grok/auth.json";
  const BILLING_URL = "https://cli-chat-proxy.grok.com/v1/billing?format=credits";
  const USER_AGENT = "OpenQuotaCycle";

  // Local cache of the last successful quota window. Contains only display
  // fields (used/label/resetsAt/periodDurationMs) — never tokens or secrets.
  function snapshotPath(ctx) {
    return ctx.app.pluginDataDir + "/quota-snapshot.json";
  }

  function readNumber(value) {
    if (value === null || value === undefined || value === "") return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }

  function periodKindLabel(type) {
    const raw = String(type || "").trim().toUpperCase();
    if (raw.indexOf("WEEK") !== -1) return "Weekly";
    if (raw.indexOf("MONTH") !== -1) return "Monthly";
    if (raw.indexOf("DAILY") !== -1 || raw.indexOf("DAY") !== -1) return "Daily";
    return "Period";
  }

  // Grok Build owns ~/.grok/auth.json: its OAuth refresh flow and file
  // persistence. This plugin only reads the first usable entry (keys use
  // Grok Build's `scope::client_id` format, so all entries are scanned); it
  // never refreshes tokens and never writes to the file.
  function readAuthExpiryMs(ctx, entry, key) {
    // `expires_at` is the primary expiry (ISO datetime). Fall back to the
    // key's JWT `exp` claim when it is absent or unparsable.
    const expiresAtMs = ctx.util.parseDateMs(entry.expires_at);
    if (expiresAtMs !== null) return expiresAtMs;
    try {
      const payload = ctx.jwt.decodePayload(key);
      if (payload && typeof payload.exp === "number" && Number.isFinite(payload.exp)) {
        return payload.exp * 1000;
      }
    } catch (e) {
      // not a JWT; no expiry available
    }
    return null;
  }

  function loadGrokAuthEntry(ctx) {
    if (!ctx.host.fs.exists(AUTH_PATH)) {
      ctx.host.log.warn("grok auth file not found: " + AUTH_PATH);
      return null;
    }

    try {
      const parsed = ctx.util.tryParseJson(ctx.host.fs.readText(AUTH_PATH));
      if (!parsed || typeof parsed !== "object") {
        ctx.host.log.warn("grok auth file is not valid json");
        return null;
      }
      for (const entryName of Object.keys(parsed)) {
        const entry = parsed[entryName];
        if (!entry || typeof entry !== "object") continue;
        const key = typeof entry.key === "string" ? entry.key.trim() : "";
        if (!key) continue;
        return { key, expiresAtMs: readAuthExpiryMs(ctx, entry, key) };
      }
      return null;
    } catch (e) {
      ctx.host.log.warn("grok auth read failed: " + String(e));
      return null;
    }
  }

  function fetchBilling(ctx, accessToken) {
    return ctx.util.request({
      method: "GET",
      url: BILLING_URL,
      headers: {
        Authorization: "Bearer " + accessToken,
        Accept: "application/json",
        "User-Agent": USER_AGENT,
        // Primary auth identifier for the Grok/OpenUsage proxy.
        "X-XAI-Token-Auth": "xai-grok-cli",
        // Kept for backward compatibility with the Grok Build surface.
        "x-grok-client-surface": "grok-build",
        "x-grok-client-version": "1.0.0",
      },
      timeoutMs: 10000,
    });
  }

  function parseCreditsWindow(ctx, data) {
    if (!data || typeof data !== "object") return null;
    const config = data.config;
    if (!config || typeof config !== "object") return null;

    const period =
      config.currentPeriod && typeof config.currentPeriod === "object"
        ? config.currentPeriod
        : null;

    const hasUsage = Object.prototype.hasOwnProperty.call(config, "creditUsagePercent");
    const hasPeriod = Boolean(
      period &&
        ((typeof period.type === "string" && period.type.trim()) ||
          (typeof period.start === "string" && period.start.trim()) ||
          (typeof period.end === "string" && period.end.trim())),
    );
    if (!hasPeriod && !hasUsage) return null;

    if (hasUsage) {
      const usage = readNumber(config.creditUsagePercent);
      if (usage === null) {
        throw "Grok usage response invalid. Try again later.";
      }
    }

    // Protobuf JSON omits zero-valued fields, so an absent percentage with a
    // current period means 0% used rather than missing quota.
    const usedPercent = hasUsage ? Number(config.creditUsagePercent) : 0;

    const label = periodKindLabel(period && period.type);
    const rawEnd = (period && period.end) || config.billingPeriodEnd;
    const resetsAt = ctx.util.toIso(rawEnd);
    const endMs = ctx.util.parseDateMs(rawEnd);
    const startMs = ctx.util.parseDateMs(period && period.start);

    // Pace visuals (ahead/on-track/behind dot, in-bar time marker) require both
    // resetsAt and a positive periodDurationMs. Prefer the real window length;
    // fall back to a safe fixed length per period kind when boundaries are
    // missing. Never emit a negative or non-finite duration.
    let periodDurationMs = null;
    if (startMs !== null && endMs !== null && endMs > startMs) {
      periodDurationMs = endMs - startMs;
    } else if (startMs === null || endMs === null) {
      if (label === "Weekly") periodDurationMs = 7 * 24 * 60 * 60 * 1000;
      else if (label === "Daily") periodDurationMs = 24 * 60 * 60 * 1000;
      else if (label === "Monthly") periodDurationMs = 30 * 24 * 60 * 60 * 1000;
    }

    return {
      used: Math.round(Math.max(0, Math.min(100, usedPercent)) * 10) / 10,
      label,
      resetsAt,
      periodDurationMs,
    };
  }

  function readOnDemandCap(config) {
    if (!config || typeof config !== "object") return 0;
    if (!Object.prototype.hasOwnProperty.call(config, "onDemandCap")) return 0;
    const cap = config.onDemandCap;
    if (cap && typeof cap === "object") {
      const n = readNumber(cap.val);
      if (n === null) throw "Grok usage response invalid. Try again later.";
      return n;
    }
    const n = readNumber(cap);
    if (n === null) throw "Grok usage response invalid. Try again later.";
    return n;
  }

  function extraUsageLine(ctx, cap) {
    if (!(cap > 0)) return null;
    const text = cap === Math.round(cap) ? String(Math.round(cap)) + " cap" : String(cap) + " cap";
    return ctx.line.text({ label: "Extra Usage", value: text });
  }

  function validateSnapshot(snapshot) {
    if (!snapshot || typeof snapshot !== "object") return false;
    const window = snapshot.window;
    if (!window || typeof window !== "object") return false;
    if (typeof window.used !== "number" || !Number.isFinite(window.used) || window.used < 0) {
      return false;
    }
    if (typeof window.label !== "string" || !window.label.trim()) return false;
    if (window.resetsAt !== null && window.resetsAt !== undefined) {
      if (typeof window.resetsAt !== "string" || !Number.isFinite(Date.parse(window.resetsAt))) {
        return false;
      }
    }
    if (window.periodDurationMs !== null && window.periodDurationMs !== undefined) {
      if (
        typeof window.periodDurationMs !== "number" ||
        !Number.isFinite(window.periodDurationMs) ||
        window.periodDurationMs <= 0
      ) {
        return false;
      }
    }
    return true;
  }

  function loadSnapshot(ctx) {
    const path = snapshotPath(ctx);
    if (!ctx.host.fs.exists(path)) return null;
    try {
      const parsed = ctx.util.tryParseJson(ctx.host.fs.readText(path));
      return validateSnapshot(parsed) ? parsed.window : null;
    } catch (e) {
      ctx.host.log.warn("quota snapshot read failed: " + String(e));
      return null;
    }
  }

  function saveSnapshot(ctx, window) {
    try {
      ctx.host.fs.writeText(
        snapshotPath(ctx),
        JSON.stringify({
          savedAt: new Date().toISOString(),
          window: {
            used: window.used,
            label: window.label,
            resetsAt: window.resetsAt || null,
            periodDurationMs: window.periodDurationMs || null,
          },
        }),
      );
    } catch (e) {
      // A failed snapshot write must not fail the live probe.
      ctx.host.log.warn("failed to persist quota snapshot: " + String(e));
    }
  }

  function buildProgressLine(ctx, window) {
    const opts = {
      label: window.label,
      used: window.used,
      limit: 100,
      format: { kind: "percent" },
    };
    if (window.resetsAt) opts.resetsAt = window.resetsAt;
    if (window.periodDurationMs) opts.periodDurationMs = window.periodDurationMs;
    return ctx.line.progress(opts);
  }

  function buildStaleResult(ctx, window, reason) {
    return {
      plan: "SuperGrok",
      lines: [buildProgressLine(ctx, window)],
      statuses: [ctx.status.chip({ text: "Stale", tone: "warning" })],
      error: reason,
    };
  }

  function probe(ctx) {
    const auth = loadGrokAuthEntry(ctx);
    if (!auth) {
      const message = "Not connected. Log in to Grok in Grok Build first.";
      const snapshot = loadSnapshot(ctx);
      if (snapshot) return buildStaleResult(ctx, snapshot, message);
      throw message;
    }

    if (auth.expiresAtMs !== null && auth.expiresAtMs <= Date.now()) {
      const message = "Grok session expired. Start Grok Build and try again.";
      const snapshot = loadSnapshot(ctx);
      if (snapshot) return buildStaleResult(ctx, snapshot, message);
      throw message;
    }

    let resp;
    try {
      resp = fetchBilling(ctx, auth.key);
    } catch (e) {
      ctx.host.log.error("usage request exception: " + String(e));
      const message = "Usage request failed. Check your connection.";
      const snapshot = loadSnapshot(ctx);
      if (snapshot) return buildStaleResult(ctx, snapshot, message);
      throw message;
    }

    if (resp.status < 200 || resp.status >= 300) {
      const message = ctx.util.isAuthStatus(resp.status)
        ? "Grok session expired. Start Grok Build and try again."
        : "Usage request failed (HTTP " + String(resp.status) + "). Try again later.";
      const snapshot = loadSnapshot(ctx);
      if (snapshot) return buildStaleResult(ctx, snapshot, message);
      throw message;
    }

    const data = ctx.util.tryParseJson(resp.bodyText);
    if (!data || typeof data !== "object") {
      throw "Usage response invalid. Try again later.";
    }

    const window = parseCreditsWindow(ctx, data);
    const cap = readOnDemandCap(data.config);
    const lines = [];
    if (window && window.label === "Weekly") {
      saveSnapshot(ctx, window);
      lines.push(buildProgressLine(ctx, window));
    }
    if (!window && cap === 0) {
      throw "No Grok quota data available. Try again later.";
    }
    const extra = extraUsageLine(ctx, cap);
    if (extra) lines.push(extra);
    return { plan: "SuperGrok", lines: lines };
  }

  globalThis.__openquotacycle_plugin = { id: PROVIDER_ID, probe };
})();
