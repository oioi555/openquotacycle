# Tasks: grok-credential-wake

## 1. Host wake generalization

- [x] 1.1 Generalize `src-tauri/src/antigravity_wake.rs` into a per-provider wake module (e.g. `credential_wake.rs`): pinned Rust-side table provider → { executable name, extra documented install dirs, argv, timeout }. Antigravity: `agy` + `-p /quota --print-timeout 1m` (unchanged values, PATH helper only). Grok: `grok` + argv `models`, PATH helper plus Grok Build's documented install dir (`$HOME/.grok/bin` on Unix, `%USERPROFILE%\.grok\bin` on Windows). No machine-local extra paths.
- [x] 1.2 Rename/extend the IPC to `credential_wake(provider_id)` (Tauri command + `lib.rs` handler registration), keeping the shared mutex serialization, exact-process skip (binary name `agy`/`grok`), bounded spawn, and stdout discard. Update the existing Antigravity caller. Do not add grok to the Window Starter catalog.
- [x] 1.3 Add per-provider argv unit tests: grok argv is exactly `["models"]` (no `-p`, no `--single`, no model name), antigravity argv is unchanged; both differ from Window Starter pins. Keep the existing exact-process and no-spawn tests passing for both providers.
- [x] 1.4 Discovery tests use a **temp-directory fixture**, not the implementing machine's home: grok is found when the documented install dir contains a `grok` binary even if `PATH` does not; grok is found on PATH / existing portable extras (`~/.local/bin`, Homebrew, …) without requiring `.grok/bin`; missing everywhere → `Missing`. Availability for the UI comes from this wake module.

## 2. Frontend generalization

- [x] 2.1 Parameterize `src/lib/antigravity-wake.ts` helpers with a provider config map: antigravity (plugin `antigravity`, marker "Start Antigravity or agy", chip-aware trigger) and grok (plugin `grok`, marker "Grok session expired", credential-error-only trigger — no wake on network/5xx stale). Export `credentialWakeProviders` (or equivalent) and keep `wakeSucceeded` shared.
- [x] 2.2 Generalize `antigravity-wake-controller.svelte.ts` (or rename to `credential-wake-controller.svelte.ts`) to iterate provider configs with identical shared semantics: in-flight join, 15-min failed-spawn cooldown, `ignoreNextStale`, rising-edge wake, and the runaway guard (shared still-stale re-probe limit of 2). Existing Antigravity tests must pass unchanged.
- [x] 2.3 Add `grokAutoWake` to `src/lib/settings.ts` (default off; load/normalize/equality like `antigravityAgyAutoWake`); surface the "Auto-start grok" toggle on Grok Customize L2 via the plugin-views flag; Reset All Customization deletes the key. Settings + settings-controller + customize-provider + reset-dialog tests.
- [x] 2.4 Show the Start grok action (icon-only RefreshCw + tooltip, spins while in flight) on the Grok card when wake is needed and the CLI is available — including while auto is on; hidden when unavailable; click runs wake then `startProbeBatch(["grok"])`. provider-card + wake-helper tests, including the network-stale no-wake case.
- [x] 2.5 Wire auto-wake: credential error on the grok card triggers wake then re-probe without a click (including toggle rising edge while already stale); network/5xx stale does not spawn; no Window Starter attempt record. Controller tests mirroring the Antigravity suite.
- [x] 2.6 Rename `antigravity-wake-controller.svelte.ts` to `credential-wake-controller.svelte.ts`, update all imports and exports to the canonical `credentialWakeController` name, and preserve behavior.

## 3. Plugin error string

- [x] 3.1 Update `plugins/grok/plugin.js` user-facing strings: product is **Grok Build**, command is `grok`. Expired throw becomes `"Grok session expired. Start Grok Build and try again."`; also replace remaining `GrokBuild` (e.g. "Log in to Grok in Grok Build first"). Stale path echoes the same strings. Keep `parseDateMs`; synthetic extra-fraction-digit fixture only if coverage is missing. Update `plugins/grok/plugin.test.js`; no snapshot/auth-file behavior changes.

## 4. Docs

- [x] 4.1 `docs/providers/grok.md`: rename GrokBuild → **Grok Build**; Expired Tokens + new Credential Wake section — `grok models` one-shot (quota-free), auto/button (`Auto-start grok` / Start grok) behavior, no OAuth, stdout not parsed, discovery = PATH helper + documented Grok Build bin dir; update Failure Behavior strings; contrast with quota-consuming `grok -p` prompts. No host-specific paths.
- [x] 4.2 `docs/window-starter.md`: note that Grok credential wake is not a Window Starter attempt and Grok Build is not a catalog runner. `docs/plugins/schema.md`: no change expected unless the stale-notice wording shifts.

## 5. Verification

- [x] 5.1 `openspec validate grok-credential-wake --strict`; `cargo test` focused on the wake module (argv tables, exact-process skip, **fixture** discovery); `bun run test` for touched frontend files; `plugins/grok/plugin.test.js` and the full `plugins/` suite pass.
- [x] 5.2 Security audit: no OAuth endpoint call, no `~/.grok/auth.json` write, no keychain/keyring write on any path; host_api redaction unchanged; `models` stdout not logged or persisted; host probe still returns `error` + lines together for the stale notice.
