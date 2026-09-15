## Context

See proposal.md Why. Grok already has the display-only snapshot, the `Stale` chip, and the callout, so this change is the wake leg plus the host/frontend generalization that two providers now force. The plugin already reads `~/.grok/auth.json` read-only; Grok Build owns OAuth refresh and rewrites that file when its CLI runs with a stale token.

A one-off spike (2026-09-12) confirmed the **argv** choice, not a machine layout: with an expired stored token, `grok models` exited 0 quickly, did not consume quota (listing only), rewrote `auth.json` with a later `expires_at`, left no leader/daemon, and printed untrustworthy stdout (`You are not authenticated.` while refresh succeeded). Treat that as evidence for `models` vs `grok -p` / `grok login`. Do not copy spike timestamps, PATH contents, or extra symlinks into the product contract.

## Goals / Non-Goals

**Goals:**

- Wake Grok credentials only through the official `grok models` one-shot, sharing the proven host machinery with Antigravity instead of duplicating it.
- Opt-in auto spawn; Start grok action visible whenever wake is needed and the CLI is available (auto on does not hide it).
- Reuse the Antigravity controller semantics as-is: one in-flight wake, exact-process skip, rising edge, 15-min failed-spawn cooldown, runaway guard (2 consecutive still-stale re-probes → cooldown).
- Keep the trigger narrow: only the credential error wakes. Grok's stale path also covers network/5xx failures, and waking into a dead network just burns a spawn.
- Discover `grok` the same way other users' machines work: shared PATH search plus Grok Build's documented install directory. No developer-machine extras.
- Naming: product is **Grok Build**; the CLI binary and spawn target is `grok`. User-facing sentences use "Grok Build". Toggle/action labels that name the command stay `grok` (same pattern as Auto-start agy).

**Non-Goals:**

- Plugin-owned x.ai OAuth, refresh-token use, or writes to `~/.grok/auth.json`.
- Parsing `models` stdout (model list) as quota or auth state.
- Interactive `grok`, `grok -p` wakes, or a kept-alive leader/daemon.
- Window Starter integration for Grok (Grok Build is not a catalog runner).
- Changing the Antigravity wake argv or trigger; its table row stays pinned.
- Hard-coding a reviewer's home PATH, `~/.local/bin` grok symlink, or other host-only locations.

## Decisions

1. **Argv is a single argument `models`, run as the grok binary.** Host `Command` args, no shell, no `--single`, no model name. Spike: quota-free and refresh-triggering. `models` exits on its own in about a second; the shared 60 s bound is generous but harmless.

   Alternative: `grok -p <prompt>`. Rejected — consumes quota. Alternative: `grok login` / device-auth. Rejected — interactive. Alternative: parse `models` stdout for auth state. Rejected — stdout can claim unauthenticated while refresh succeeded; the re-probe is the only truth.

2. **Generalize the host wake; do not clone it.** Rename `antigravity_wake.rs` → `credential_wake.rs` with one IPC command `credential_wake(provider_id)` and a Rust-side pinned table: provider → { executable name, extra documented install dirs, argv, timeout }. Antigravity stays `agy` + `-p /quota --print-timeout 1m` via the existing PATH helper only. Grok is `grok` + `models`, PATH helper plus Grok Build's documented bin dir. Per-provider argv unit tests lock both tables (no `--model`/`-p` on grok). Exact-process skip matches the binary name (`agy` / `grok`). Availability for the UI comes from that same wake module — not from Window Starter's runner catalog.

   Alternative: a parallel `grok_wake` command copying `antigravity_wake.rs`. Rejected — second copy of the same spawn/cooldown logic. Alternative: plugin `ctx.host` spawn. Rejected — plugins must not launch third-party CLIs. Alternative: add grok to `window_starter.rs` discovery so the card can reuse `agyAvailable`-style catalog flags. Rejected — that would imply Grok Build is a Window Starter runner.

3. **Discovery is documented locations + PATH, not this developer PC.** Official install (xAI getting-started): Unix `$HOME/.grok/bin`, Windows `%USERPROFILE%\.grok\bin`, same family as `~/.grok/auth.json` the plugin already uses. GUI process PATH often lacks dirs a login shell added, which is why Window Starter already searches a small portable extra set (`~/.local/bin`, Homebrew, …) **and** `PATH`. Grok wake reuses that helper, then also looks in the documented Grok Build bin dir. Tests use a temp-directory fixture, never the implementing machine's home.

   Alternative: PATH only. Rejected — the installer may only patch shell rc files, so a desktop-launched app would hide the button for a normal install. Alternative: enumerate every symlink a particular machine happens to have. Rejected — not portable.

4. **Trigger is the credential-error string, not the Stale chip.** `needsWake(grok)` matches the marker in `error`/`staleError` only (`Grok session expired`). Grok's stale path also renders on network/5xx failures where spawning a CLI that needs the network is pointless. Deliberate divergence from Antigravity (which also matches the Stale chip).

5. **Error string becomes wake-actionable.** Plugin throws `"Grok session expired. Start Grok Build and try again."` (mirrors Antigravity's start-agy wording), and the stale path echoes it verbatim. Update `plugins/grok/plugin.js` throws + tests + `docs/providers/grok.md` Failure Behavior.

   Alternative: keep "Reconnect Grok in Grok Build to refresh it." Rejected — it tells the user to do by hand what the app can now do, and the detector needs a stable marker.

6. **Frontend generalization via provider config, not inheritance.** `antigravity-wake.ts` becomes a config map: per-provider `{ pluginId, credentialError marker, executable id, setting key }`. Controller logic (inFlight join, cooldown, `ignoreNextStale`, stale-reprobe guard, rising edge) is shared — Antigravity behavior must not drift. The canonical controller module path is `src/svelte/controllers/credential-wake-controller.svelte.ts` and its exported instance is `credentialWakeController`. Settings: `grokAutoWake` default off on Grok Customize L2; Reset All Customization deletes it like `antigravityAgyAutoWake`. Card action: Start grok (icon-only RefreshCw + tooltip, spins while in flight), gated on wake-module availability.

   Alternative: a second `grok-wake-controller` copy. Rejected — doubles the guard logic.

7. **No new Antigravity spec for the runaway guard.** The 2-stale-reprobe cooldown already ships in the shared controller (`ANTIGRAVITY_WAKE_STALE_REPROBE_LIMIT`). This change's spec pins the same backoff in prose without rewriting the Antigravity capability.

8. **Expiry parsing is already generic.** `ctx.util.parseDateMs` / `Date.parse` already accept RFC3339 with fractional seconds. Do not pin a spike's nanosecond timestamp as a required fixture. Add a synthetic extra-fraction-digit expiry in tests only if coverage is missing.

## Risks / Trade-offs

- [Risk] `grok models` regresses (starts consuming quota, or stops refreshing). → argv pinned and unit-tested; docs cite the argv decision; kill criterion identical to Antigravity: stop shipping the wake rather than adding a prompt.
- [Risk] `models` exit 0 while refresh failed → re-probe returns the credential error → runaway guard engages the cooldown after 2 attempts.
- [Risk] `auth.json` written concurrently by a real Grok Build run. → unchanged: plugin reads read-only per probe; wake only launches the owner CLI.
- [Risk] A custom `GROK_BIN_DIR` / cargo debug binary named differently. → Only the exact binary name `grok` in PATH + documented install dir. Same rule as `agy`. Out-of-tree names are unsupported.

## Migration Plan

1. Land the host generalization (argv tables + portable discovery tests) with the IPC rename, then the frontend config map, then the plugin string, then docs.
2. No credential migration. Toggle defaults off; snapshot and auth-file behavior unchanged.
3. Roll back by reverting the grok table + UI; Antigravity's pinned argv stays in the same table.

## Open Questions

None. Argv `models` is the verified one-shot. Discovery is the documented Grok Build bin dir plus the existing PATH helper.
