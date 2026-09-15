# Tasks for Fix Antigravity CLI and OAuth fallback

## 1. Host Discovery

- [x] 1.1 Extend `LsDiscoverOpts` handling in `src-tauri/src/plugin_engine/host_api.rs` so `csrfFlag` may be absent and an empty marker list requests a markerless process; verify existing language-server callers still compile and pass their discovery tests.
- [x] 1.2 Add exact `agy` executable matching and return its listening ports with an empty CSRF value; add host regression coverage that accepts `/usr/bin/agy` and rejects similarly named executables, verified by the relevant Rust test command.

## 2. Antigravity Plugin

- [x] 2.1 Try the existing Linux language-server discovery first and markerless `agy` discovery second, reusing local summary/legacy probing and preserving Linux request context; verify regular LS precedence and CLI fallback with `bunx vitest run plugins/antigravity/plugin.test.js`.
- [x] 2.2 Ensure the `agy` path probes both supported local schemes/ports and only returns quota data after a supported response; verify a markerless discovery fixture returns `Session`/other recognized lines without Cloud Code calls.
- [x] 2.3 Remove the plugin-owned Google OAuth token endpoint, client credentials, refresh request, and refreshed-token write path; keep only unexpired access-token candidates and verify an expired current Topic token makes no OAuth request and returns an actionable `agy`/Antigravity hint.
- [x] 2.4 Preserve valid-token precedence, valid cache reads, summary-first semantics, legacy fallback, and actionable errors; replace obsolete refresh-success tests and verify the complete Antigravity plugin test file passes.

## 3. Documentation

- [x] 3.1 Update `docs/providers/antigravity.md` to document `agy` as a supported Linux local source, its markerless/CSRF-less discovery, valid-token-only Cloud Code fallback, and credential renewal ownership by Antigravity/`agy`; verify the documented paths and process names match the implementation.

## 4. Verification

- [x] 4.1 Run `bunx vitest run plugins/antigravity/plugin.test.js` and the full `bunx vitest` suite; verify no plugin or shared-host regressions.
- [x] 4.2 Run the applicable Rust formatting/check/test commands for `src-tauri` and `bun run bundle:plugins`; verify the host API compiles, the bundled plugin contains the fix, and no Google OAuth refresh constants remain in the plugin.
- [x] 4.3 Run `openspec validate fix-antigravity-cli-fallback --type change --strict`; verify all requirements, scenarios, and task dependencies validate successfully.
