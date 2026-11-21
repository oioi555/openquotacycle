# Proposal

## Why

The JS/TS and Rust lockfiles have accumulated semver-compatible patch and minor updates since `8fc2bee` (`v0.3.0`), including security fixes surfaced by `bun audit` (`undici`, `@vitest/mocker`, etc.) and Tauri `2.12.x` / Svelte `5.59.1` / `bits-ui` `2.21.0` releases.

## What Changes

- Run `bun update` to update semver-compatible frontend/tooling packages in `package.json` and `bun.lock` (`svelte` `5.57.1` -> `5.59.1`, `bits-ui` `2.19.3` -> `2.21.0`, `@tauri-apps/api` `2.12.0` -> `2.12.5`, `@tauri-apps/cli` `2.12.0` -> `2.12.6`, `@lucide/svelte` `1.49.0` -> `1.77.0`, `vite` `8.3.1` -> `8.3.8`, `vitest` `4.1.11` -> `4.1.12`, plus Tauri plugins and dev tooling).
- Run `cargo update` to refresh `src-tauri/Cargo.lock` within existing `Cargo.toml` constraints (`tauri` `2.12.0` -> `2.12.7`, `wry` `0.57.0` -> `0.57.3`, `tao` `0.37.1` -> `0.37.3`, `tokio` `1.53.1` -> `1.54.1`, `rustls` / `rustls-webpki` / `aws-lc-rs`, etc.).
- Update `src/svelte/pages/settings.test.ts` dropdown menu assertions to wait for the newly opened menu's `menuitem` rather than `getByRole("menu")`, which now matches the closing menu's exit-animation node (`data-state="closed"`, `data-ending-style`) in `bits-ui` `2.21.0`.
- Out of scope: major upgrades (`typescript` 7, `eslint` 10, `vitest` 5, `jsdom` 31, `@testing-library/jest-dom` 8) and `Cargo.toml` breaking range bumps.

## Capabilities

### New Capabilities
<!-- none -->

### Modified Capabilities
<!-- none — dependency refresh and test wait adjustment only; no spec-level behavior changes (`skip_specs: true`) -->

## Impact

- `package.json`, `bun.lock`: 22 packages updated within semver ranges (`bun audit` reduced from 47 to 33 findings; remaining findings live inside transitive major-pinned trees such as `devalue` / `source-map-js`).
- `src-tauri/Cargo.lock`: semver-compatible crate refresh (`src-tauri/Cargo.toml` unchanged).
- `src/svelte/pages/settings.test.ts`: test wait specificity fix for `bits-ui` `2.21.0` exit transition DOM retention.
