## 1. Update

- [x] 1.1 Run `bun update` in the repo root and confirm `package.json` is untouched (lockfile-only diff).
- [x] 1.2 Run `cargo update` in `src-tauri` and confirm `Cargo.toml` is untouched; spot-check that tauri lands on 2.11.5, tauri-plugin-log on 2.9.1, tauri-plugin-updater on 2.11.0.

## 2. Verify

- [x] 2.1 `rtk cargo clippy --lib` and `cargo fmt --check` clean; `rtk cargo test --lib` passes (102 tests).
- [x] 2.2 `bun run test` passes (1307 tests).
- [x] 2.3 Smoke test with `bun tauri dev`: app starts, a plugin probe refreshes usage data, tray icon and window behave (residency, left click) — no regression from transitive bumps.

## 3. Record

- [x] 3.1 Commit the lockfile changes as a single `chore(deps)` commit.
