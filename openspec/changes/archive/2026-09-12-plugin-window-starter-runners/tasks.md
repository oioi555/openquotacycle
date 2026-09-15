## 1. Manifest capability

- [x] 1.1 Parse optional `windowStarter` on `PluginManifest` (`enabledByDefault`, `defaultRunner`, `allowedRunners`, `windows[]` with `id` / `line` / `weeklyLine` / optional `enabledByDefault`). Malformed values warn and become `None` without failing plugin load; verify with `cargo test` covering object, missing, and non-object cases
- [x] 1.2 Expose the parsed capability on `PluginMeta` / `list_plugins` DTO (`src-tauri/src/lib.rs`) and `src/lib/plugin-types.ts`; verify TypeScript types match the camelCase payload
- [x] 1.3 Add `windowStarter` to `plugins/claude/plugin.json`, `codex`, `zai`, and `antigravity` per design D1 (Claude = `claude` only; Z.ai = `zcode` default plus `opencode`/`hermes`/`pi`, no Claude Code; Codex first-party default plus `opencode`/`hermes`/`pi`; Antigravity two windows default off, `agy` only). Leave `opencode-go` and others unchanged; verify each plugin's `plugin.test.js` still loads the manifest

## 2. Native runner catalog

- [x] 2.1 Replace `WindowStarterProvider` with a host catalog (`claude`, `codex`, `zcode`, `agy`, `opencode`, `hermes`, `pi`) plus the pin table from design D2. `run_window_starter` takes `plugin_id`, `runner_id`, `window_line`, `prompt`. Unknown plugin/runner/window or disallowed pair (Claude × OpenCode/Hermes/Pi, Z.ai × Claude Code) returns `Unsupported` without spawn; verify `cargo test` for every pin row including Claude Haiku via `claude` only, Z.ai `zcode --prompt` with no model flag and no `--max-turns`, OpenCode `zai-coding-plan/glm-5.3-flash`, Pi `zai/glm-5.3-flash` and `openai-codex/gpt-5.6-luna` with `--no-tools --no-session`, and agy slugs without `--dangerously-skip-permissions`
- [x] 2.2 Change `window_starter_discover` to report the seven catalog executables (id = runner id). Update `window_starter_run` Tauri args to the new shape; verify existing success/fail/timeout tests still pass against `run_bounded`
- [x] 2.3 Confirm redaction still covers starter CLI output (`host_api` redact tests); add a case if a new command string would leak tokens

## 3. Settings, eligibility, history

- [x] 3.1 Add `windowStarterByPlugin` override map in `src/lib/settings.ts` (absent key = plugin defaults). Effective enabled/runner/window helpers; verify settings unit tests for defaults, stored overrides, and ignore of unknown runner ids
- [x] 3.2 Extend `WindowStarterAttempt` with `windowLine` and `runnerId`. Lock lookup is `(pluginId, windowLine)`; records missing `windowLine` map to the plugin's first declared window; verify `src/lib/window-starter.test.ts` for Antigravity independent locks and 500-record bound
- [x] 3.3 Rewrite `classifyWindowStarterProviders` / `getFiveHourReset` / weekly guard to iterate declared windows (label + `periodDurationMs === 5h`, `weeklyLine` not `"weekly"` substring). Drop `WINDOW_STARTER_PROVIDER_IDS`. Verify `src/lib/window-starter-state.test.ts` for Claude ready, OpenCode Go absent, Antigravity default-off, weekly via declared line, and `cli-missing` on the selected runner

## 4. Orchestration and page

- [x] 4.1 Update `backend.ts` + `window-starter-runner.svelte.ts` to discover catalog executables, start at most one CLI at a time, pass `{ pluginId, runnerId, windowLine, prompt, timeoutSecs }`, and confirm against that window's reset. Verify runner/controller tests: global off, participation off, five-hour lock per window, no second prompt on unconfirmed
- [x] 4.2 Window Starter page lists every declared window (Antigravity = two rows) with selected runner + PATH status and history that shows plugin, window, and runner. No runner dropdown on this page; verify `window-starter` page/controller tests
- [x] 4.3 Customize L2 (`customize-provider.svelte`) shows participation only when `meta.windowStarter` exists. Runner `<select>` only if more than one allowed runner; Claude is a fixed Claude Code label. Z.ai offers `zcode` / `opencode` / `hermes` / `pi` (no Claude Code). Codex offers `codex` / `opencode` / `hermes` / `pi`. Antigravity: Session/Claude toggles, not model names. No model text field. OpenCode Go: no starter controls. Verify `customize-provider.test.ts`

## 5. Reset

- [x] 5.1 `handleOverviewDisplayReset` deletes that plugin's `windowStarterByPlugin` key; `handleResetAllCustomization` deletes the whole map and does not touch `windowStarterEnabled`. Verify `settings-controller.test.ts`
- [x] 5.2 Reset All dialog copy mentions Window Starter participation/runner/window defaults and does not claim the global switch resets; verify dialog tests

## 6. Docs and suite

- [x] 6.1 Update `docs/window-starter.md`, `docs/plugins/schema.md`, `docs/providers/{claude,codex,zai}.md`, add Antigravity starter notes, and README so documented commands match the pin table (Claude = Claude Code only; Z.ai default `zcode`, no Claude Code path; OpenCode uses `zai-coding-plan/` not `opencode-go/`; Pi uses `zai/glm-5.3-flash` and `openai-codex/gpt-5.6-luna`)
- [x] 6.2 `bun run test`, `bun run typecheck`, and `cargo test` green

## 7. Window Starter page and Customize L2 UX

- [x] 7.1 Sort `classifyWindowStarterProviders` by `pluginSettings.order` then declared window order; expose `participationEnabled` on each view. Verify `window-starter-state.test.ts` for Antigravity-then-Claude order and OpenCode Go omitted
- [x] 7.2 Window Starter page: Overview-style Auto-start card (title outside, Switch inside); target-row context menu (Turn on/off, Customize…, separator, Run now…); confirmation dialog before manual run. Verify `window-starter.test.ts` and context-menu tests
- [x] 7.3 Wire page actions in `app-content.svelte`: participation uses the existing settings handlers (plugin-level vs window-level), Customize opens `customize:<pluginId>`, confirmed Run now calls `windowStarterRunner.runWindow`. Verify runner tests: auto-start still gated; manual `runWindow` works while global is off and while locked, and still serializes
- [x] 7.4 Customize L2: move Window Starter below Always Visible / On Demand; add an icon-only copy button for the selected runner command (`<prompt>` placeholder, first declared window). Verify `customize-provider.test.ts` for section order and clipboard text
- [x] 7.5 Update `docs/window-starter.md` (card chrome, list order, context menu, manual run, copy command) so it matches D6/D8
- [x] 7.6 `bun run test`, `bun run typecheck`, and `cargo test` green

## 8. zcode 0.16.5 argv

- [x] 8.1 Drop `--max-turns` from the Z.ai × `zcode` pin, frontend preview, tests, docs, and D1/D7. zcode 0.16.5 help lists it but `parseArgs({ strict: true })` rejects it. Pass `--prompt {prompt}` only; do not add `--mode plan`, `--allowed-tools`, `--disallowed-tools`, or `--permission-mode`. Verify `cargo test` `zai_zcode_prompt_without_model` and `getWindowStarterCommand("zai","zcode","session")` is `zcode --prompt <prompt>`
- [x] 8.2 `openspec validate plugin-window-starter-runners --strict`, `bun run test`, and `cargo test` green

## 9. Compact clocks and prompt

- [x] 9.1 Target-row subtitle is last-run local `M/D HH:mm` only (no runner). Activity rows drop Confirmed/Failed-style status words and use the same clock. The starter prompt is the fixed English sentence `Quotracker Window Starter request. Respond with only "OK".`. Verify `formatWindowStarterClock`, `createWindowStarterPrompt`, and `window-starter` page tests
- [x] 9.2 `openspec validate plugin-window-starter-runners --strict`, `bun run test`, and `bun run typecheck` green
- [x] 9.3 Activity collapsed title is the plugin name only. Window, runner, and command stay in the expanded details so Antigravity Session/Claude do not truncate. Verify `window-starter` page tests

## 10. Sequential Antigravity manual runs

- [x] 10.1 Release `runningKey` when the CLI exits (not when confirmation ends). Confirmations are a per-window map. `checkConfirmations` runs from the latest `syncInputs` snapshot. Classify `running` before `off`. Verify runner tests: Session then Claude both record; a later probe snapshot with a future reset confirms the pending attempt; `cargo` not required

## 11. Pasteable copy command and unconfirmed icon

- [x] 11.1 Copy button and attempt `command` embed the starter prompt with POSIX quoting. Pin-table helper without a prompt still shows `<prompt>`. Verify `getWindowStarterCommand(..., prompt)` and Customize L2 clipboard text
- [x] 11.2 Unconfirmed activity uses an alert icon, not the waiting clock. Pending keeps the yellow clock. Verify `window-starter` page tests

## 12. Antigravity 0% used still started

- [x] 12.1 Keep `resetsAt` on Session/Claude when the quota summary has `resetTime`, even if rounded `used === 0`. `Not started` only when reset time is missing. Verify `plugins/antigravity/plugin.test.js` and Window Starter confirmation can see a future reset after a tiny `agy` request

## 13. OpenQuota Not started divergence (0% used + live reset)

Do not port OpenQuota `isFreshSessionWindow` (Overview hides the countdown when a session window is 0% used with a future reset). Quotracker matches agy/IDE: a live `resetsAt` is started.

- [x] 13.1 Overview `metric-line-progress`: a 5-hour Session/Claude line with `used === 0` and a parseable future `resetsAt` shows the countdown, not `Not started`. Keep `Not started` only when reset time is missing (`periodDurationMs === 5h && !hasParseableReset`). Verify `src/svelte/components/metric-line-progress.test.ts`
- [x] 13.2 `classifyWindowStarterProviders`: `used === 0` + future `resetsAt` is `active`, not idle/`ready`, for Antigravity Session and Claude as well as Claude Session. Verify `src/lib/window-starter-state.test.ts`
- [x] 13.3 Confirmation: after a successful CLI, a later probe with `used === 0` and a future five-hour `resetsAt` marks the attempt confirmed. The runner MUST NOT auto-retry because used is still 0%. Verify `src/svelte/controllers/window-starter-runner.test.ts` (existing confirm case uses `used: 1`; add a 0% case)
- [x] 13.4 Docs: `docs/window-starter.md` — idle/active/confirm key on a future `resetsAt`, not `used > 0`. `docs/providers/antigravity.md` already keeps `resetTime` at 0%; add that OpenQuota Overview may still show Session `Not started` at 0% used while Quotracker shows the countdown to match agy/IDE
- [x] 13.5 `openspec validate plugin-window-starter-runners --strict`. Do not archive until asked. Do not rewrite stored unconfirmed Window Starter history unless asked
