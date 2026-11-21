# Tasks

## 1. Dependency Refresh

- [x] 1.1 Run `bun update` in the repository root and confirm only semver-compatible updates apply (`package.json`, `bun.lock`, `bun audit` drops from 47 to 33).
- [x] 1.2 Run `cargo update --manifest-path src-tauri/Cargo.toml` and confirm `src-tauri/Cargo.toml` stays untouched while `src-tauri/Cargo.lock` updates `tauri` (`2.12.7`), `wry` (`0.57.3`), `tokio` (`1.54.1`), and crypto/TLS transitive crates.

## 2. Test Compatibility & Verification

- [x] 2.1 Update `src/svelte/pages/settings.test.ts` to wait for the opened menu's `menuitem` under `bits-ui` `2.21.0` exit-transition retention and verify `bun run test --run src/svelte/pages/settings.test.ts` passes (8/8).
- [x] 2.2 Run `bun run test --run` (69 files / 1118 tests), `bun run typecheck`, `bun run lint`, `bun run build`, and `env -u CLAUDE_CONFIG_DIR cargo test --manifest-path src-tauri/Cargo.toml` (155 tests) and confirm all pass.
- [x] 2.3 Run `openspec validate refresh-dependencies --strict` and confirm the change passes validation.
