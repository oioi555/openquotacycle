## Why

Window Starter still hardcodes Claude, Codex, and Z.ai to their first-party CLIs. Antigravity's 5-hour windows do not start until used, and Codex / Z.ai quotas can also be billed through OpenCode, Hermes, or Pi. Enable/disable alone cannot choose that authenticated runner, and pinning the wrong model ID starts the wrong quota or none at all. Claude's subscription forbids third-party clients, so that provider must stay on Claude Code. Z.ai now has a CLI (`zcode --prompt`), so it does not need a Claude Code path whose GLM model name lives in user settings.

## What Changes

- Replace the hardcoded Claude/Codex/Z.ai registry with a plugin `windowStarter` capability plus a host-owned runner catalog.
- Let the user pick, per provider, which authenticated CLI runs the one minimal starter prompt when more than one harness is allowed. Tool choice lives on Customize L2 (`customize:<pluginId>`). Claude's harness is fixed to Claude Code.
- Window Starter page: the global ON/OFF uses Overview card chrome (title outside the card, toggle inside). The starter-target list follows the provider list order. Each row has a context menu: that window's ON/OFF, Customize L2, a separator, and a confirmed manual run.
- Customize L2: Window Starter is last (it is optional). An icon-only copy button copies the selected runner command so it can be pasted into a terminal.
- Pin models from a host `(provider × runner)` table. Do not add a model text field. Pin when the IDs are known. Z.ai's default harness is `zcode` (no model flag); do not start Z.ai through Claude Code. Pi pins like OpenCode (`--model provider/id` + `-p`); it is an optional Codex/Z.ai runner only.
- Add Antigravity as a Window Starter target (`agy`), default off, with independent Session and Claude 5-hour windows and independent locks.
- Treat a five-hour window as started when the server sent a future `resetTime`, even if rounded usage is 0%. Overview shows the countdown (not `Not started`). Window Starter classifies it Active and can confirm. Do not copy OpenQuota's `isFreshSessionWindow` overlay that hides that countdown.
- Omit OpenCode Go: its rolling session does not need a starter.
- Keep global Window Starter default-off. A provider starts only when the global switch and that provider's starter participation are both on.
- Native execution stays argv-array, no shell, no env/credential injection. The WebView sends plugin id, runner id, and an optional window line — never arbitrary argv.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `window-starter`: Plugin-declared starter targets, host runner catalog, per-provider runner/window settings, `(provider × runner)` model pins, Antigravity dual windows, lock key `(pluginId, windowLine)`, Window Starter page card/list/context-menu UX, confirmed manual run, Customize L2 copy-command. Idle vs active vs confirmation key on a future five-hour `resetsAt`, not `used > 0`. Do not copy OpenQuota's 0%-used `Not started` overlay.
- `antigravity-quota`: Keep a server-provided five-hour `resetTime` even when rounded usage is 0%. Overview MUST show that countdown. OpenQuota may still label the same Session meter `Not started`.
- `customization-reset`: Reset All and per-provider display reset restore Window Starter participation, runner, and window picks to plugin defaults.

## Impact

- Native: `src-tauri/src/window_starter.rs` (+ tests) becomes a runner catalog and pin table; `run_window_starter` takes plugin id, runner id, optional window line, and prompt. `plugin_engine/manifest.rs` parses optional `windowStarter`. `list_plugins` exposes the capability on plugin meta.
- Plugin manifests: `plugins/{claude,codex,zai,antigravity}/plugin.json` declare `windowStarter`. `opencode-go` and other plugins omit it.
- Frontend: `src/lib/window-starter.ts`, `window-starter-state.ts`, settings keys, Window Starter page, Customize L2, reset handlers, backend invoke types. `metric-line-progress` must keep `Not started` only when a 5-hour reset is missing; classify/confirm treat `used === 0` + future `resetsAt` as started.
- Docs: `docs/window-starter.md`, `docs/plugins/schema.md`, provider pages, README. Antigravity docs note agy/IDE vs OpenQuota `Not started`.
- No new credentials, no reading `~/.claude/settings.json`, no user-defined commands, no Z.ai-via-Claude-Code starter.
