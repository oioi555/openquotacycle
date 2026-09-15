## Why

The dependency lockfiles have drifted: the bun side has a dozen in-range updates pending (lucide-react 1.21→1.39, tauri plugin JS packages, tailwindcss 4.3.3, react 19.2.8), and the Cargo lockfile is behind on tauri 2.11.5 and the tauri-plugin-* releases (notably tauri-plugin-updater 2.11.0, which pairs with the already-updated JS side). A periodic refresh keeps security patches flowing and keeps the next refactor on current dependencies.

## What Changes

- Run `bun update` to pull all in-range npm/package.json updates (semver-compatible only).
- Run `cargo update` to refresh `src-tauri/Cargo.lock` (in-range only; ~100 transitive bumps including aws-lc-sys 0.41→0.45 and cc 1.2→1.4).
- Verify with `cargo clippy --lib`, `cargo fmt --check`, the full frontend suite (`bun run test`), and the Rust lib tests.
- Explicitly out of scope: major/minor bumps that require range changes in `Cargo.toml`/`package.json` — rquickjs 0.11→0.12, aes-gcm 0.10→0.11, base64 0.22→0.23, serial_test 3→4 (dev), @types/node 25→26, jsdom 29→30, jest-dom 6→7. These stay pinned; revisit individually later.

## Capabilities

(none — no spec-level behavior changes; dependency refresh only, `skip_specs: true`)

## Impact

- `bun.lock`, `src-tauri/Cargo.lock` — lockfile-only changes expected.
- `package.json` / `src-tauri/Cargo.toml` — unchanged (all updates are within existing ranges).
- Build tooling risk: aws-lc-sys and cc major-ish transitive jumps require a clean rebuild; frontend runtime risk is low.
