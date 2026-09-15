## Context

See `proposal.md` for why. Current Window Starter is a closed set in `src-tauri/src/window_starter.rs` (`WindowStarterProvider::{Claude,Codex,Zai}`), `src/lib/window-starter.ts` (`WINDOW_STARTER_PROVIDER_IDS`), and `src/lib/window-starter-state.ts` (names, executables, first `periodDurationMs === 5h` line, weekly = label contains `"weekly"`). The frontend invokes `run_window_starter(providerId, prompt)`. Settings store only `windowStarterEnabled`. Customize L2 (`customize-provider.svelte`) is metric visibility/order only.

Plugin manifests already carry ignored extra JSON; `visibleByDefault` is the pattern to copy (optional field, warn, never break load). `list_plugins` currently does not surface a Window Starter capability.

## Goals / Non-Goals

**Goals:**

- Host owns runner templates and the pin table. Plugins declare *whether* they participate and *which windows* to watch.
- Frontend sends `{ pluginId, runnerId, windowLine?, prompt }`. Native builds argv.
- Keep one-attempt / five-hour lock / confirmation-without-retry / 500-record history / no credentials. The prompt is the fixed English sentence `Quotracker Window Starter request. Respond with only "OK".`.

**Non-Goals:**

- User-defined commands, free-text model fields, or reading `~/.claude/settings.json`.
- Env/credential injection.
- OpenCode Go starter, Grok/Cursor/Copilot starters.
- Starting the Claude (Anthropic) subscription through OpenCode, Hermes, Pi, or any third-party harness.
- Starting Z.ai through Claude Code.

## Decisions

### D1 — Plugin capability + host runner catalog

`plugin.json` MAY include:

```json
"windowStarter": {
  "enabledByDefault": true,
  "defaultRunner": "claude",
  "allowedRunners": ["claude"],
  "windows": [
    { "id": "session", "line": "Session", "weeklyLine": "Weekly" }
  ]
}
```

Claude's `allowedRunners` is `["claude"]` only: Anthropic's subscription forbids third-party clients, so Window Starter must not offer OpenCode, Hermes, or Pi for the Claude plugin.

Z.ai's default is `zcode` (`zcode --prompt` exists). Do not offer Claude Code for Z.ai: that path needs a user-mapped GLM name and is the inherit edge case this change drops. Codex keeps `["codex", "opencode", "hermes", "pi"]`. Z.ai keeps `["zcode", "opencode", "hermes", "pi"]`. Antigravity uses two windows, both `enabledByDefault: false`, `defaultRunner: "agy"`. OpenCode Go omits the object.

Serde: add an optional `window_starter` on `PluginManifest`. Malformed values log and become `None`. Pass through `PluginMeta` / `list_plugins`.

Host catalog (executable + argv template, no shell):

| runnerId | executable | argv (prompt substituted by native) |
|---|---|---|
| `claude` | `claude` | `-p {prompt} --model claude-haiku-4-5 --tools "" --max-turns 1 --no-session-persistence` |
| `codex` | `codex` | `exec --ephemeral --skip-git-repo-check --sandbox read-only -m {model} -c model_reasoning_effort="none" {prompt}` |
| `zcode` | `zcode` | `--prompt {prompt}` (never `--max-turns`; zcode 0.16.5 help lists it, `parseArgs` rejects it) |
| `agy` | `agy` | `-p {prompt} --model {slug}` (never `--dangerously-skip-permissions`) |
| `opencode` | `opencode` | `run {prompt} -m {provider}/{model}` (never `--auto`) |
| `hermes` | `hermes` | `-z {prompt} --provider {p} -m {model}` (never `--yolo`) |
| `pi` | `pi` | `-p {prompt} --model {provider}/{model} --no-session --no-tools --no-context-files --no-approve` (never `--api-key`) |

Alternative considered: plugin-owned argv. Rejected — WebView/plugin script must not choose process arguments.

### D2 — Pin table is `(pluginId, runnerId, windowId)`

Which model to send is a provider problem; the flag shape is a runner problem. Hardcoded constants live next to today's Haiku/Luna pins in Rust (single source). Frontend may mirror display strings for history, but native is authoritative.

| plugin | runner | window | pin |
|---|---|---|---|
| `claude` | `claude` | session | `claude-haiku-4-5` via `--model` |
| `codex` | `codex` | session | `gpt-5.6-luna` |
| `codex` | `opencode` | session | `openai/gpt-5.6-luna` |
| `codex` | `hermes` | session | provider `openai-codex`, model `gpt-5.6-luna` |
| `codex` | `pi` | session | `openai-codex/gpt-5.6-luna` (not `openai/…`) |
| `zai` | `zcode` | session | none |
| `zai` | `opencode` | session | `zai-coding-plan/glm-5.3-flash` (not `opencode-go/…`) |
| `zai` | `hermes` | session | provider `zai`, model `glm-5.3-flash` |
| `zai` | `pi` | session | `zai/glm-5.3-flash` (built-in Coding Plan provider, not `opencode-go/` and not `zai-api`) |
| `antigravity` | `agy` | session | `gemini-3.8-flash-low` |
| `antigravity` | `agy` | claude | `claude-sonnet-4-6` |

There is no Claude × OpenCode / Claude × Hermes / Claude × Pi row, and no Z.ai × Claude Code row. Native rejects those pairs as `Unsupported`.

Pi 0.85.1 on this host lists `zai/glm-5.3-flash` and `openai-codex/gpt-5.6-luna`. Built-in `zai` is the Coding Plan endpoint (`https://api.z.ai/api/coding/paas/v4`). ChatGPT Codex OAuth is `openai-codex`, not `openai`.

Alternative considered: Z.ai via Claude Code with omitted `--model` (inherit user GLM mapping). Rejected — `zcode --prompt` starts the Coding Plan window without reading settings or inventing a GLM id. Alternative: UI model field. Rejected (friction).

### D3 — Settings keys follow `visibleByDefault`

Store only overrides. Absent key = plugin default.

```ts
windowStarterByPlugin?: Record<pluginId, {
  enabled?: boolean               // single-window plugins
  runnerId?: string
  windows?: Record<windowId, { enabled?: boolean }>
}>
```

Antigravity uses `windows.session.enabled` / `windows.claude.enabled`; do not require a plugin-level `enabled` if windows are independent. Eligibility: global `windowStarterEnabled` AND that window's effective enabled flag.

Reset deletes the plugin's key (per-provider) or the whole map (Reset All). Global switch stays.

### D4 — Lock and history key `(pluginId, windowLine)`

Extend `WindowStarterAttempt` with `windowLine` (and `runnerId`). `getLatestAttemptForProvider` becomes lookup by plugin + window line. Legacy records without `windowLine` map to the plugin's first declared window so existing five-hour locks keep working.

Eligibility uses the declared progress line (`label` match) and `periodDurationMs === 5h`, not "first 5h line". Weekly uses `weeklyLine`, not `label.includes("weekly")`.

### D5 — Invoke shape

Replace `run_window_starter(provider_id, prompt)` with `run_window_starter(plugin_id, runner_id, window_line, prompt)`. Native validates `plugin_id` is a loaded plugin with the capability, `runner_id` is in `allowedRunners`, `window_line` is a declared window, then looks up the pin. Unknown → `Unsupported` without spawn.

Discovery: `window_starter_discover` returns availability for the seven catalog executables, not the three plugin ids. Frontend joins selected runner → executable.

Timeout stays 60s (clamp 1–120). `agy --print-timeout` default is 5 minutes; we still kill at our timeout.

### D6 — Customize L2 owns runner; the page owns status, order, and shortcuts

Window Starter page:

- Global switch uses Overview card chrome: title **Auto-start** outside the card, `ui-card` body with a `Switch` inside. Not a header-row On/Off `Button`.
- One row per declared window (Antigravity = two rows), status badge, last-run `M/D HH:mm` subtitle when an attempt exists. No runner name on the row. No runner dropdown.
- Activity collapsed rows: plugin name only, an outcome icon without a status word, and the same compact clock. Window, runner, and command stay in the expanded details.
- Row order: `pluginSettings.order`, then each plugin's declared `windows` order. Plugins that omit `windowStarter` are skipped. Ids in `order` without a loaded meta are skipped; metas missing from `order` append in `pluginMetas` order.
- Context menu on each row (same `ui-menu` pattern as Overview): that window's Turn on/Turn off (participation, not the global switch), Customize… → `customize:<pluginId>`, separator, Run now… → confirmation dialog.

Customize L2, only if `meta.windowStarter` is present, and **last** on the page (Always Visible / On Demand come first; Window Starter is optional):

1. Participation switch (or two for Antigravity).
2. Runner `<select>` only when `allowedRunners.length > 1`. Claude and Antigravity show a fixed harness label (Claude Code / `agy`).
3. Icon-only copy next to the runner. Clipboard text is `getWindowStarterCommand(pluginId, runnerId, firstDeclaredWindowId, prompt)` with the starter prompt already substituted and POSIX-quoted, so it pastes into a terminal. History `command` uses the same string. Multi-window plugins copy the first declared window (Antigravity Session). `<prompt>` remains only as the pin-table placeholder when no prompt is passed.
4. No model field.

A stored `runnerId` outside `allowedRunners` is ignored and the plugin default is used.

### D8 — Manual run vs auto-start gates

`maybeAutoRun` stays gated: global on, participation on, idle five-hour window, not locked, selected runner on PATH, one CLI at a time.

`runWindow` is the shared native path (host argv, history, confirmation polling, `runningKey` serialize). A confirmed manual run calls `runWindow` even when global/participation/idle/lock would block auto-start. After that attempt, the five-hour lock still applies to later auto-starts. `runningKey` is held only while a starter CLI process is in flight — not during quota confirmation — so Antigravity Session then Claude can both record after the first CLI exits. While `runningKey` is set, Run now… is disabled and `runWindow` is a no-op. Run now… is also disabled when the selected runner is not known available. Confirmations are keyed by `(pluginId, window line)` and may overlap. Confirmation re-reads the latest probe snapshot after each refresh so a reset that appears after the CLI is not missed. A row that is executing a CLI shows Starting even when participation is off.

Confirmation is an in-app alertdialog (Cancel / Run), not `window.confirm`. Cancel, Escape, and backdrop dismiss do not spawn a process.

Copy uses `navigator.clipboard.writeText` on a user gesture. No new Tauri clipboard plugin. Failure is logged; the user can still copy the command from history.

### D7 — Hermes / zcode / Pi safety flags

`zcode --prompt` defaults to `--mode yolo`. zcode 0.16.5 prints `--max-turns` in `--help`, but its Node `parseArgs({ strict: true })` option set does not include it, so `--prompt … --max-turns 1` exits with `Unknown option '--max-turns'`. Pass `--prompt {prompt}` only. Do **not** pass `--max-turns`, `--allowed-tools`, `--disallowed-tools`, or `--permission-mode` (same help/parser mismatch). `--mode` is parsed; do **not** add `--mode plan` unless a follow-up confirms it still bills the Coding Plan. Blast radius is the 60s host timeout and the five-hour lock.

Hermes has no first-class empty-tools flag. Pass `-z` + provider + model only. Do not pass `--yolo`. `--safe-mode` disables user config and is too broad for quota routing.

Pi defaults to `read` / `bash` / `edit` / `write`. Pass `-p` (print/one-shot), `--model provider/id`, `--no-session`, `--no-tools`, `--no-context-files`, and `--no-approve`. Do **not** pass `--api-key`. Do **not** add `--thinking off` in this change: GLM-5.3-Flash thinking is always-on, and Codex Luna's off mapping is runner-specific. Pi has no `--max-turns`.

### D9 — Started means a live reset, not used > 0 (do not copy OpenQuota)

Google's Antigravity quota summary can round a tiny request to `used === 0` (`remainingFraction ≈ 1`) while still sending `resetTime` and showing a 5-hour countdown in `agy` / Antigravity IDE. Dropping that `resetTime` made Overview say `Not started` and blocked Window Starter confirmation (task 12.1). Keep the server timestamp whenever it is present.

OpenQuota is a **different product choice**, not the same mapper bug. Its native mapper also keeps `resetTime` at remaining ≈ 1. Its Overview then overlays `isFreshSessionWindow` (`sessionWindow && usedPercent === 0 && future resetsAt`) and paints `Not started` with “Sessions start after you send your first message.” Live OpenQuota therefore shows Session `Not started` while Claude already counts down — after the same tiny `agy` request that started both windows in agy/IDE.

Quotracker MUST NOT port that overlay:

- Overview `Not started` only when a five-hour line has no parseable `resetsAt`.
- Window Starter idle = expired reset, or (`used === 0` **and** no `resetsAt`). A future `resetsAt` is `active` even at 0% used.
- Confirmation keys on that window's five-hour reset moving into the future. `used === 0` with a live reset confirms. Do not auto-retry because rounded usage is still 0%.
- Archived visual-parity work (`align-visual-with-openquota`) is tokens/chrome only. It MUST NOT reintroduce hide-countdown-at-0%.

agy vs IDE remaining-fraction mismatch is expected (different LS endpoints/caches). Both are started if `resetTime` is present. Do not rewrite already-unconfirmed history rows.

## Risks / Trade-offs

- [OpenCode `zai-coding-plan/` (or Codex `openai/` / Pi `openai-codex/`) ids missing until the user has logged into that provider] → Attempt fails, lock five hours, history shows the command. Same as today's missing CLI.
- [Older Pi builds omit `zai/glm-5.3-flash` until `pi update --models`] → Same miss-then-lock; pin stays `zai/glm-5.3-flash` (verified on Pi 0.85.1).
- [Pin constants drift when Haiku / Luna / GLM Flash / agy slugs change] → One Rust table, same maintenance as today.
- [Hermes/OpenCode still load default tools] → Bounded by one prompt + five-hour lock; no `--yolo` / `--auto`. Pi is bounded by `--no-tools --no-session`.
- [zcode `--prompt` runs yolo without a working `--max-turns`] → Host 60s timeout + five-hour lock; do not pass advertised-but-unparsed flags.
- [agy 60s timeout] → Failed/timeout already locks five hours; raise later if history shows timeouts.
- [Dual Antigravity attempts serialize] → Keep the existing one-CLI-at-a-time runner loop; Session then Claude if both ready.
- [Manual run while locked or global-off still bills the subscription] → Confirmation dialog names the plugin, window, and runner; auto-start remains gated.
- [Clipboard API missing in some WebViews] → Log and keep history command copy as fallback; do not add a clipboard plugin in this change.
- [OpenQuota visual-parity hide-countdown] → Do not port `isFreshSessionWindow`. Window Starter confirmation and Overview countdown depend on a live `resetsAt` at 0% used. Visual token work stays tokens/chrome only.
- [agy vs IDE remainingFraction mismatch] → Expected; treat both as started when `resetTime` is present. Do not average or pick the larger used%.
- [Already-unconfirmed history after the old drop-resetTime plugin] → Leave those rows unconfirmed unless the user asks to rewrite them.

## Migration Plan

- `windowStarterEnabled` unchanged (default false).
- New `windowStarterByPlugin` absent → plugin defaults (Claude/Codex/Z.ai on with first-party runners; Antigravity off). Existing users keep current first-party behavior once they turn the global switch on.
- History records without `windowLine`/`runnerId` remain valid; lock maps to first window.
- Rollback: ignore `windowStarter` in manifests and the new settings key; restore the three-provider enum.

## Open Questions

None that block implementation. Hermes empty-toolsets and zcode `--mode plan` can be tightened later without changing the pin table or UI.
