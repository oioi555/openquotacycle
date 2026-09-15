## Context

See proposal.md Why. Plugin snapshot + keyring read are already in `plugins/antigravity/plugin.js`. The plugin still cannot spawn processes or refresh OAuth. Window Starter already owns a bounded CLI runner, but its Antigravity pin is `agy -p <prompt> --model …`, which starts an agent turn.

Verified 2026-09-12 on this machine (`agy -p "/quota" --output-format json --print-timeout 1m`, 7s, exit 0):

- Keyring `service=gemini` `username=antigravity` expiry `2026-09-12T07:37:59+09:00` → `2026-09-12T08:33:57+09:00` (~1h). Secret hash changed. Log: `expired=false` then `token refreshed` (print-mode silent auth; ~4 min before expiry).
- `Print mode: running slash command /quota`. `num_turns: 0`. All usage token fields `0`. No new `conversations/*.db`. Process exited; no daemon left.
- Language server came up for the run and shut down with the CLI. Quotracker must wait for exit, then re-probe (fresh keyring → Cloud Code), not scrape `/quota` stdout.

## Goals / Non-Goals

**Goals:**

- Wake credentials only through the official CLI one-shot above.
- Opt-in auto spawn; Start agy action visible whenever wake is needed and `agy` is on PATH (auto on does not hide it).
- One in-flight wake; skip spawn when an exact `agy` process already exists.
- Keep snapshot as display fallback **with** the actionable callout error; keep OAuth inside `agy`.
- Read `agy` keyring items whose Secret Service content type includes MIME parameters.

**Non-Goals:**

- Plugin-owned Google OAuth, refresh-token use, or keyring writes.
- Parsing `/quota` stdout as the quota source.
- Interactive/`pty` `agy`, `agy remote-control`, or a kept-alive daemon.
- Reusing Window Starter pins or starting a 5-hour window as a side effect of wake.
- Auto-wake for any provider other than Antigravity.

## Decisions

1. **Argv is `-p` `/quota` `--print-timeout` `1m`.** Host `Command` args, no shell. Do not pass `--model`, a user prompt, or `--dangerously-skip-permissions`. `--output-format json` is unnecessary in production (used only for this spike). Without `--print-timeout`, verified 2026-09-12: silent auth succeeds then `/quota` dies with `retrieveUserQuotaSummary: context canceled` (~500ms), even with stdout drained.

   Alternative: Window Starter's model prompt. Rejected — verified to send a cascade and consume quota. Alternative: interactive `agy`. Rejected — needs a pty, stays running, duplicates instances. Alternative: `agy models`. Rejected — `/quota` is the documented quota-free slash command and was verified to refresh the keyring.

2. **New host command, not `window_starter_run`.** Same bounded-spawn pattern (60s, output cap, no shell) with a fixed argv table of one row. Return status/exit/duration only; do not persist CLI stdout (it can include account quota text).

   Alternative: plugin `ctx.host` spawn. Rejected — plugins must not launch third-party CLIs; Window Starter already put that in the host. Alternative: wrap probe inside the Rust plugin runtime. Rejected — settings and the button live in the UI; probe controller already owns retry.

3. **Trigger is Stale chip or the start-agy error, then re-probe.** Snapshot success (`statuses: Stale`) must wake when auto is on; waiting for blocking `output.error` would skip the common post-boot path once a snapshot exists. The snapshot return MUST include the same actionable `error` string as the throw path so the card callout remains (host: `error` + lines = `staleError`). After wake exits 0, run `startProbeBatch(["antigravity"])`. If `agy` is already running, skip spawn and only re-probe. Turning Auto-start on while already Stale must wake immediately (do not wait for the next probe).

4. **Auto default off.** Customize L2 (Antigravity), not global Settings. The card shows an icon-only **Start agy** refresh (tooltip explains; spins while in flight) whenever Stale/error and `agy` is on PATH — auto on does not hide it. Auto runs the same one-shot without a click, at most once per cooldown (15 min) after a failed wake; success clears the need until the next Stale/error. Reset All Customization restores off.

   Alternative: hide the button when auto is on. Rejected — `/quota` can take up to 1m and a failed wake left a Grok-like callout with no retry. Alternative: default on. Rejected — background-spawning Google's CLI needs an explicit opt-in.

5. **Do not parse `/quota` output.** After a successful wake the keyring access token is unexpired; existing Cloud Code fallback is the quota source. Avoid a second parser on an undocumented TSV/JSON CLI schema.

6. **Vendored oo7 0.6 for Secret Service MIME params.** crates.io 0.6.0 rejects `text/plain; charset=utf8` (agy/go-keyring). Upstream parse-before-`;` is oo7#517, only in 0.7.0-alpha (rustc 1.95). Project rustc is 1.93.1, so patch 0.6 via `[patch.crates-io]` `src-tauri/vendor/oo7`.

## Risks / Trade-offs

- [Risk] `agy -p /quota` contract changes (starts a turn / spends quota). → Pin argv to `/quota` plus `--print-timeout 1m` (needed so the slash command is not context-canceled); host tests lock the args; docs cite the changelog + this spike. If a future CLI regresses, stop shipping the wake rather than adding a model prompt.
- [Risk] Auto-wake on every 15 min refresh while Stale. → After a successful wake the next probe should be live; cooldown only on wake failure.
- [Risk] Two probes spawn two CLIs. → Process mutex; skip if `agy` is already discovered.
- [Risk] Secret Service locked / `agy` missing. → No spawn; keep snapshot or error; hide the button when `agy` is not on PATH.
- [Risk] Snapshot success swallows the card callout. → Snapshot returns the thrown error string with the lines; host treats `error` + lines as `staleError`.
- [Risk] `/quota` stdout contains account data. → Do not log or persist stdout; redaction already covers CLI output in the host.

## Migration Plan

1. Revise this change's artifacts, then implement host spawn + settings + card button + auto re-probe on top of the existing snapshot/keyring code.
2. No credential migration. Toggle defaults off.
3. Roll back by reverting the wake IPC and UI; snapshot/keyring can remain.

## Open Questions

None. `/quota` keyring rewrite, MIME read, stale callout, and auto/button behavior are implemented.


---

## Revisions

| 日期 | 类型 | 变更描述 | 原因 | 影响 API |
|------|------|----------|------|----------|
| 2026-09-12 | behavior | Added a runaway guard to the auto-wake controller: after 2 consecutive wake-succeeded-but-re-probe-still-stale cycles, the controller applies the same 15-minute cooldown as a failed spawn (and resets on a fixed re-probe or a failed spawn). New constant ANTIGRAVITY_WAKE_STALE_REPROBE_LIMIT = 2 in src/lib/antigravity-wake.ts. Spec semantics ("at most one wake" per Stale trigger) unchanged; this caps how many trigger cycles may spawn agy before backing off. | Design accepted "auto-wake on every 15 min refresh while Stale" on the assumption a successful wake yields a live probe; nothing stopped repeated agy spawns if that assumption broke (account mismatch, Cloud Code outage while agy auth works) or if the user sets a short refresh interval. | - |
