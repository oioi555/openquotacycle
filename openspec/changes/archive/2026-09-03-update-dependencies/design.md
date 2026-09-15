## Context

Dependency ranges in `package.json` and `src-tauri/Cargo.toml` are caret ranges, so a plain `bun update` / `cargo update` refreshes lockfiles without touching manifests. `cargo update --dry-run` showed tauri 2.11.3→2.11.5, tauri-plugin-log 2.8.0→2.9.1, tauri-plugin-updater 2.10.1→2.11.0, patch-level bumps for the other tauri plugins, plus ~100 transitive bumps (aws-lc-sys 0.41→0.45, cc 1.2→1.4) and a few dependency-tree removals (ahash, bitvec, borsh — dead transitive branches).

## Goals / Non-Goals

**Goals:**
- One lockfile refresh for both ecosystems, verified by the full test suite, in a single commit.

**Non-Goals:**
- No manifest range bumps (majors and out-of-range minors stay pinned; see proposal).
- No rquickjs 0.12 migration — the plugin JS runtime needs its own verification pass.
- No aes-gcm 0.11 — 0.x minor bumps are breaking for crypto crates and there is no current need.

## Decisions

- **In-range only, both ecosystems at once**: lockfile churn is isolated from API-change churn, keeping the commit bisectable.
- **Full `cargo update`, not package-by-package**: the transitive set is mostly build tooling and crypto backends; a partial update leaves the lockfile in a mixed state that is harder to reason about than either extreme.
- **tauri-plugin-updater JS+Rust pairing**: the update naturally aligns both at 2.11.x; nothing to do beyond letting cargo catch up.

## Risks / Trade-offs

- [aws-lc-sys 0.45 or cc 1.4 fails to build on this toolchain] → rebuild surfaces it immediately; fall back to `cargo update -p <culprit> --precise <old>` for the offending crate instead of reverting everything.
- [Transitive removals (ahash/bitvec/borsh trees) indicate feature-flag shifts] → they come from in-range updates of their parents; the full test suite plus a real plugin probe run cover the affected paths.
- [Hidden behavior drift in runtime deps] → 1307 frontend tests, 102 Rust lib tests, and a manual plugin probe smoke test after update.

## Open Questions

None.

### Revision (during apply)

- `bun update` (bun 1.3) also raised the caret ranges in `package.json` to the installed versions (e.g. `^2` → `^2.3.2`). Accepted: same in-range policy, no excluded major touched. The proposal's "manifest unchanged" expectation was adjusted accordingly.
- **@base-ui/react pinned to exact `1.6.0`**: 1.7.0 breaks the plugin checkbox toggle (second click no longer triggers `savePluginSettings` — caught by `App.test.tsx > toggles plugins in settings`). Whether this is a real app regression or a changed behavior the test should adapt to needs investigation against base-ui 1.7; out of scope for this dependency-refresh change. Revisit before any future `bun update`.
