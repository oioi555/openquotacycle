## Why

Grok hits the same post-reboot dead end Antigravity did before `antigravity-stale-snapshot`: Grok Build's OAuth access token in `~/.grok/auth.json` expires, nothing in Quotracker refreshes it, and the card sits at `Stale` until the user reconnects by hand. The display-only snapshot half of the Antigravity pattern already exists for Grok; the missing half is the credential wake.

The official CLI analog of `agy -p /quota` is `grok models`: a quota-free listing that, when the stored token is expired, lets Grok Build refresh `auth.json` itself and then exits. No plugin-owned OAuth. Grok Build stays the sole owner of refresh, exactly like `agy`.

## What Changes

- Keep the read-only `~/.grok/auth.json` credential source and the existing display-only snapshot (unchanged policy: no plugin-owned OAuth, no keyring changes).
- Generalize the host credential wake to per-provider pinned argv tables. Grok's wake argv is a single argument `models` on the `grok` binary. Discovery is portable: the same PATH search used for `agy` and Window Starter runners, plus Grok Build's documented install directory (`$HOME/.grok/bin` on Unix, `%USERPROFILE%\.grok\bin` on Windows). Do not special-case a developer's shell PATH, extra symlinks, or machine-local dirs. Same guarantees as Antigravity: no shell, bounded timeout, stdout discarded, exact-process skip, serialized wakes, 15-min failed-spawn cooldown, and the shared runaway guard.
- Grok Customize L2 gains an **Auto-start grok** toggle, default off. On: the credential error triggers at most one wake, then a re-probe, including the rising edge while the card is already showing that error. Off: an icon-only **Start grok** refresh action (tooltip explains, spins in flight) runs the same one-shot on click. The action is shown whenever the CLI is available and wake is needed, whether auto is on or off; it is hidden when the CLI is missing.
- The plugin's stale error string becomes wake-actionable ("Grok session expired. Start Grok Build and try again."). Product name in copy is **Grok Build**; the spawned command remains `grok`.
- Wake is not a Window Starter start: no model prompt, no window pin, no Window Starter attempt record, and Grok Build is not added to the Window Starter catalog. `grok models` stdout is never parsed or persisted.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `grok-supergrok-quota`: when the Grok Build credential is expired, the system can refresh it only by running the official `grok models` one-shot automatically (opt-in) or via a card action, then re-probe; the stale snapshot keeps rendering with the wake-actionable callout; Auto-start grok defaults off, lives on Grok Customize L2, and is restored by Reset All Customization. Plugin-owned OAuth remains forbidden.

## Impact

- Host: generalize `src-tauri/src/antigravity_wake.rs` into a per-provider wake (pinned argv tables, shared mutex/cooldown). New or renamed IPC (e.g. `credential_wake(providerId)`). Grok executable discovery lives on that wake module (existing PATH helper + documented Grok Build bin dir). Do **not** teach `window_starter.rs` a grok catalog runner.
- Frontend: generalize `src/lib/antigravity-wake.ts` + `antigravity-wake-controller.svelte.ts` to provider configs (antigravity, grok); `grokAutoWake` setting (default off, Reset All Customization restores); Grok Customize L2 toggle; provider-card Start grok action on Grok's credential error; availability gating from the wake module.
- Plugin: `plugins/grok/plugin.js` error-string update (+ tests). Snapshot/auth-file behavior unchanged.
- Docs: `docs/providers/grok.md` (wake, auto/button, quota-free `grok models` vs quota-consuming prompts), `docs/window-starter.md` cross-note that wake is not a Window Starter attempt.
- Settings: persist the toggle (default off); Reset All Customization restores off.
