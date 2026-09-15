## 1. Codex account quota classification

- [x] 1.1 Refactor the account-window classification in `plugins/codex/plugin.js` to retain one emit-capable candidate per duration bucket, gate the five-hour Session bucket on exact `plan_type === "plus"`, and verify focused tests cover positional header precedence and body fallback.
- [x] 1.2 Emit the retained Plus Session candidate before Weekly with API-derived reset and period metadata, preserve Weekly behavior for every plan, and verify focused tests cover reversed positions, duplicate buckets, and weekly-only responses.
- [x] 1.3 Add negative regressions for Pro, other, unknown, and missing `plan_type` values proving five-hour windows remain hidden while eligible Weekly data is unchanged.

## 2. Manifest and timeline integration

- [x] 2.1 Add Session before Weekly in `plugins/codex/plugin.json` with primary orders 1 and 2, then verify manifest-derived Overview/tray tests select Session when present and fall back to Weekly when Session is absent.
- [x] 2.2 Add a Codex-shaped quota timeline regression proving Session and Weekly become separate five-hour and weekly rows without production timeline changes, and run the focused timeline test.
- [x] 2.3 Run `bun run bundle:plugins` and verify the bundled Codex plugin JavaScript and manifest match their source files.

## 3. Documentation and security audit

- [x] 3.1 Update `docs/providers/codex.md` with Plus-only five-hour classification, position-independent examples, and non-Plus suppression; verify the documented JSON and duration table match tests.
- [x] 3.2 Update the README Codex metric summary to advertise Session again while retaining Weekly, Reviews, and Credits, and verify the provider support table is current.
- [x] 3.3 Audit all Codex request and response fields touched by this change against `src-tauri/src/plugin_engine/host_api.rs` URL/body/log redaction lists; add redaction tests for any newly exposed sensitive field or record that no redaction change is needed, then run the relevant Rust tests.

## 4. Verification

- [x] 4.1 Run the focused Codex plugin, tray-primary, and quota-timeline Vitest files and verify all new and existing regressions pass.
- [x] 4.2 Run the full frontend test suite and `bun run build`, fixing change-related failures and recording unrelated pre-existing failures.
- [x] 4.3 Run repository lint/type/Rust checks applicable to plugin changes and `openspec validate restore-codex-plus-five-hour-window --strict`, verifying the implementation and Change both pass.
