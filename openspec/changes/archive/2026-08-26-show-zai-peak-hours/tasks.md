## 1. Peak Status Behavior

- [x] 1.1 Add a pure Z.ai peak-window classifier based on `ctx.nowIso` and fixed UTC+8 weekday boundaries; add start-inclusive, in-window, end-exclusive, outside-window, and weekend tests, then verify with `bun run test --run plugins/zai/plugin.test.js`.
- [x] 1.2 Emit the red `Peak` or green `Off-Peak` `Peak Hours` badge on every successful authenticated probe, preserve it beside `No usage data`, and verify badge colors plus unchanged quota metrics with `bun run test --run plugins/zai/plugin.test.js`.
- [x] 1.3 Declare the overview-scoped `Peak Hours` badge in `plugins/zai/plugin.json` and verify the plugin bundle accepts the manifest with `bun run bundle:plugins`.

## 2. Documentation And Security Audit

- [x] 2.1 Update `docs/providers/zai.md` with the official Monday-Friday 14:00-18:00 UTC+8 schedule, its 15:00-19:00 JST equivalent, and the `Peak` / `Off-Peak` badge behavior; verify the documented boundaries match the plugin tests.
- [x] 2.2 Audit the Z.ai request/response fields against `src-tauri/src/plugin_engine/host_api.rs` redaction lists and existing provider patterns; redact the existing `customerId` response field discovered by the audit and verify it with a focused Rust regression test.

## 3. Verification

- [x] 3.1 Run `bun run test --run plugins/zai/plugin.test.js` and `bun run bundle:plugins`; verify all Z.ai regressions pass and bundled plugin resources are generated successfully.
- [x] 3.2 Run `openspec validate show-zai-peak-hours --strict`; verify the implemented behavior and completed task state remain consistent with all Change artifacts.
