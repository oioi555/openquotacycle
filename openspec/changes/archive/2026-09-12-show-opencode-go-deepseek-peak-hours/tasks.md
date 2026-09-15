## 1. Peak Status Behavior

- [x] 1.1 Add a UTC DeepSeek peak-window classifier in `plugins/opencode-go/plugin.js` based on `ctx.nowIso`, emit `DeepSeek Peak` / `danger` or `DeepSeek Off-Peak` / `positive` on successful Go-meter probes only, and verify morning start/end, lunch gap, afternoon start/end, weekday outside, weekend-in-clock-hours, entitlement-only spend, and unchanged quota metrics with `bun run test --run plugins/opencode-go/plugin.test.js`.

## 2. Documentation And Security Audit

- [x] 2.1 Update `docs/providers/opencode-go.md` and the README OpenCode Go summary with the Monday-Friday UTC 01:00-04:00 and 06:00-10:00 schedule, JST 10:00-13:00 and 15:00-19:00 equivalents, 2x DeepSeek-only rate, and header-chip labels; verify the documented boundaries match the plugin tests.
- [x] 2.2 Audit OpenCode Go request/response fields against `src-tauri/src/plugin_engine/host_api.rs` redaction lists and existing provider patterns; add or update tests only if a gap is found.

## 3. Verification

- [x] 3.1 Run `bun run test --run plugins/opencode-go/plugin.test.js` and `bun run bundle:plugins`; verify all OpenCode Go regressions pass and bundled plugin resources are generated successfully.
- [x] 3.2 Run `openspec validate show-opencode-go-deepseek-peak-hours --strict`; verify the implemented behavior and completed task state remain consistent with all Change artifacts.

## 4. Go-only local spend

- [x] 4.1 Restrict `plugins/opencode-go/plugin.js` spend scan to `providerID` `opencode-go`; ignore Zen `opencode` rows; keep entitlement spend-only for Go rows; fail closed when entitlement or missing key has only Zen spend; verify with `bun run test --run plugins/opencode-go/plugin.test.js`.
- [x] 4.2 Update `docs/providers/opencode-go.md` local spend wording so tiles are Go-only and Zen is not advertised; verify it matches the plugin tests.

## 5. Final verification

- [x] 5.1 Run `bun run test --run plugins/opencode-go/plugin.test.js` and `bun run bundle:plugins`; verify all OpenCode Go tests pass.
- [x] 5.2 Run `openspec validate show-opencode-go-deepseek-peak-hours --strict`; verify artifacts and completed tasks stay consistent.
