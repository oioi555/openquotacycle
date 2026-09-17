(function () {
  const PROVIDER_ID = "opencode-go";
  const USAGE_URL = "https://opencode.ai/zen/go/v1/usage";
  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const WINDOWS = [
    { key: "rolling", label: "Session", periodDurationMs: FIVE_HOURS_MS },
    { key: "weekly", label: "Weekly", periodDurationMs: WEEK_MS },
    { key: "monthly", label: "Monthly" },
  ];
  const ALLOWED_STATUSES = ["ok", "rate-limited"];

  function dataDir(ctx) {
    const override = ctx.host.env.get("OPENCODE_DATA_DIR");
    if (typeof override === "string" && override.trim()) {
      return override.trim().replace(/\/+$/, "");
    }
    const xdg = ctx.host.env.get("XDG_DATA_HOME");
    if (typeof xdg === "string" && xdg.trim()) {
      return xdg.trim().replace(/\/+$/, "") + "/opencode";
    }
    return "~/.local/share/opencode";
  }

  function loadAuthKey(ctx) {
    const authPath = dataDir(ctx) + "/auth.json";
    try {
      if (!ctx.host.fs.exists(authPath)) return null;
      const parsed = ctx.util.tryParseJson(ctx.host.fs.readText(authPath));
      if (!parsed || typeof parsed !== "object") return null;
      const entry = parsed[PROVIDER_ID];
      if (!entry || typeof entry !== "object") return null;
      const key = typeof entry.key === "string" ? entry.key.trim() : "";
      return key || null;
    } catch (e) {
      return null;
    }
  }

  function isIso8601(value) {
    if (typeof value !== "string" || !value.trim()) return false;
    const match = /^(\d{4})-(\d{2})-(\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})$/.exec(value);
    if (!match) return false;
    const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
    if (
      date.getUTCFullYear() !== Number(match[1]) ||
      date.getUTCMonth() !== Number(match[2]) - 1 ||
      date.getUTCDate() !== Number(match[3])
    ) return false;
    return Number.isFinite(Date.parse(value));
  }

  function normalizeWindow(raw) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    if (!ALLOWED_STATUSES.includes(raw.status)) return null;
    if (typeof raw.percent !== "number" || !Number.isFinite(raw.percent)) return null;
    if (!isIso8601(raw.resetsAt)) return null;
    return {
      used: Math.min(100, Math.max(0, raw.percent)),
      resetsAt: new Date(Date.parse(raw.resetsAt)).toISOString(),
    };
  }

  function parseUsage(data) {
    if (!data || typeof data !== "object" || Array.isArray(data)) return null;
    const usage = data.usage;
    if (!usage || typeof usage !== "object" || Array.isArray(usage)) return null;
    const parsed = {};
    for (let i = 0; i < WINDOWS.length; i += 1) {
      const window = WINDOWS[i];
      const normalized = normalizeWindow(usage[window.key]);
      if (!normalized) return null;
      parsed[window.key] = normalized;
    }
    return parsed;
  }

  function isEntitlementError(body) {
    return !!(body && body.error && body.error.type === "EntitlementError");
  }

  function isDeepSeekPeakHours(nowIso) {
    const nowMs = Date.parse(nowIso);
    if (!Number.isFinite(nowMs)) {
      throw "Invalid plugin clock.";
    }
    const now = new Date(nowMs);
    const day = now.getUTCDay();
    const hour = now.getUTCHours();
    return day >= 1 && day <= 5 && ((hour >= 1 && hour < 4) || (hour >= 6 && hour < 10));
  }

  function deepSeekPeakStatus(ctx) {
    const peak = isDeepSeekPeakHours(ctx.nowIso);
    return ctx.status.chip({
      text: peak ? "DeepSeek Peak" : "DeepSeek Off-Peak",
      tone: peak ? "danger" : "positive",
    });
  }

  function deriveMonthlyPeriodDurationMs(resetsAtIso) {
    const endMs = Date.parse(resetsAtIso);
    if (!Number.isFinite(endMs)) return null;
    const end = new Date(endMs);
    const year = end.getUTCFullYear();
    const month = end.getUTCMonth();
    const day = end.getUTCDate();
    const start = new Date(Date.UTC(
      year,
      month - 1,
      1,
      end.getUTCHours(),
      end.getUTCMinutes(),
      end.getUTCSeconds(),
      end.getUTCMilliseconds(),
    ));
    const maxDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    start.setUTCDate(Math.min(day, maxDay));
    const durationMs = endMs - start.getTime();
    return Number.isFinite(durationMs) && durationMs > 0 ? durationMs : null;
  }

  function fetchUsage(ctx, apiKey) {
    return ctx.util.request({
      method: "GET",
      url: USAGE_URL,
      headers: {
        Authorization: "Bearer " + apiKey,
        Accept: "application/json",
      },
      timeoutMs: 10000,
    });
  }

  function buildProgressLines(ctx, usage) {
    return WINDOWS.map(function (window) {
      const data = usage[window.key];
      const options = {
        label: window.label,
        used: data.used,
        limit: 100,
        format: { kind: "percent" },
        resetsAt: data.resetsAt,
      };
      const periodDurationMs = window.periodDurationMs || (
        window.key === "monthly" ? deriveMonthlyPeriodDurationMs(data.resetsAt) : null
      );
      if (periodDurationMs) options.periodDurationMs = periodDurationMs;
      return ctx.line.progress(options);
    });
  }

  function dayKey(ms) {
    const d = new Date(ms);
    return d.getUTCFullYear() + "-" + String(d.getUTCMonth() + 1).padStart(2, "0") + "-" + String(d.getUTCDate()).padStart(2, "0");
  }

  function fmtTokens(tokens) {
    if (tokens >= 1000000) return (Math.round(tokens / 100000) / 10) + "M tokens";
    if (tokens >= 1000) return (Math.round(tokens / 100) / 10) + "k tokens";
    return String(tokens) + " tokens";
  }

  function spendLabel(cost, tokens) {
    if (cost != null) return "$" + cost.toFixed(2) + " · " + fmtTokens(tokens);
    return fmtTokens(tokens);
  }

  function scanSpend(ctx, dir) {
    const totals = {};
    try {
      if (!ctx.host.fs.exists(dir)) return totals;
      const names = ctx.host.fs.listDir(dir) || [];
      const now = new Date();
      const cutoff = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - 29 * 24 * 60 * 60 * 1000;
      const sql =
        "SELECT time_created AS t, json_extract(data,'$.cost') AS cost, COALESCE(json_extract(data,'$.tokens.total'),0) AS tokens, json_extract(data,'$.providerID') AS provider FROM message WHERE time_created >= " +
        cutoff +
        " AND json_valid(data) AND json_extract(data,'$.role') = 'assistant' AND json_type(data,'$.cost') IN ('integer','real')";
      for (let i = 0; i < names.length; i++) {
        if (!/^opencode.*\.db$/.test(names[i])) continue;
        let rows;
        try {
          rows = ctx.util.tryParseJson(ctx.host.sqlite.query(dir + "/" + names[i], sql));
        } catch (e) {
          ctx.host.log.warn("opencode db read failed: " + String(e));
          continue;
        }
        if (!Array.isArray(rows)) continue;
        for (let j = 0; j < rows.length; j++) {
          const row = rows[j];
          if (!row || typeof row !== "object") continue;
          const provider = row.provider;
          if (provider !== PROVIDER_ID) continue;
          const ms = Number(row.t);
          const cost = Number(row.cost);
          const tokens = Number(row.tokens);
          if (!Number.isFinite(ms) || !Number.isFinite(cost) || cost < 0) continue;
          const key = dayKey(ms);
          if (!totals[key]) totals[key] = { cost: 0, tokens: 0 };
          totals[key].cost += cost;
          if (Number.isFinite(tokens) && tokens > 0) totals[key].tokens += tokens;
        }
      }
    } catch (e) {
      ctx.host.log.warn("opencode spend scan failed: " + String(e));
    }
    return totals;
  }

  function appendSpend(ctx, lines, totals) {
    const now = new Date();
    const today = dayKey(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const y = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - 1));
    const yesterday = dayKey(y.getTime());
    function push(label, key) {
      const entry = totals[key];
      if (!entry) return;
      lines.push(ctx.line.text({ label: label, value: spendLabel(entry.cost, entry.tokens) }));
    }
    push("Today", today);
    push("Yesterday", yesterday);
    let cost = 0;
    let tokens = 0;
    let any = false;
    const keys = Object.keys(totals);
    for (let i = 0; i < keys.length; i++) {
      any = true;
      cost += totals[keys[i]].cost;
      tokens += totals[keys[i]].tokens;
    }
    if (any) lines.push(ctx.line.text({ label: "Last 30 Days", value: spendLabel(cost, tokens) }));
  }

  function probe(ctx) {
    const dir = dataDir(ctx);
    const apiKey = loadAuthKey(ctx);
    const spend = scanSpend(ctx, dir);
    if (!apiKey) {
      const lines = [];
      appendSpend(ctx, lines, spend);
      if (lines.length > 0) return { plan: null, lines: lines };
      throw "Authentication unavailable";
    }

    let response;
    try {
      response = fetchUsage(ctx, apiKey);
    } catch (e) {
      throw "Usage unavailable";
    }

    const status = response && response.status;
    const body = response && typeof response.bodyText === "string"
      ? ctx.util.tryParseJson(response.bodyText)
      : null;

    if (status === 401) {
      throw "Authentication failed";
    }
    if (status === 403 && isEntitlementError(body)) {
      const lines = [];
      appendSpend(ctx, lines, spend);
      if (lines.length > 0) return { plan: null, lines: lines };
      throw "No Go subscription";
    }
    if (typeof status !== "number" || !Number.isFinite(status) || status < 200 || status >= 300) {
      throw status === 403 ? "Access denied" : "Usage unavailable";
    }

    const usage = parseUsage(body);
    if (!usage) {
      throw "Usage unavailable";
    }

    const lines = buildProgressLines(ctx, usage);
    appendSpend(ctx, lines, spend);
    return { plan: "Go", lines: lines, statuses: [deepSeekPeakStatus(ctx)] };
  }

  globalThis.__openquotacycle_plugin = { id: PROVIDER_ID, probe: probe };
})();
