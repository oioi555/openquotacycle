# Design

## Context

`package.json` uses caret ranges (`^`) except `typescript` (`~6.0.3`), and `src-tauri/Cargo.toml` pins compatible minor ranges. Running `bun update` and `cargo update` refreshes both ecosystems without crossing major versions.

## Goals / Non-Goals

**Goals:**
- Apply all semver-compatible updates across `bun.lock` / `package.json` and `src-tauri/Cargo.lock` in one verified pass.
- Keep `src-tauri/Cargo.toml` untouched and avoid breaking major upgrades.

**Non-Goals:**
- Major upgrades (`typescript` 7, `eslint` 10, `vitest` 5, `jsdom` 31, `@testing-library/jest-dom` 8).
- Transitive-only overrides for `devalue` / `source-map-js` outside upstream semver ranges.

## Decisions

- **Semver-compatible update only:** Keeps runtime and tooling changes low-risk and bisectable while pulling `Tauri 2.12.7`, `svelte 5.59.1`, `bits-ui 2.21.0`, `vitest 4.1.12`, and `undici` fixes.
- **Test wait adjustment in `src/svelte/pages/settings.test.ts`:** Under `bits-ui` `2.21.0`, closing a `DropdownMenu` leaves the old `role="menu"` node in the DOM briefly with `data-state="closed"` and `data-ending-style` while the next menu opens asynchronously. Waiting for `screen.getByRole("menuitem", { name: ... })` (and scoping the leftover menu query via `.closest('[role="menu"]')`) verifies the newly opened menu without masking real dropdown regressions.

## Risks / Trade-offs

- **Dropdown exit transition timing in UI tests:** Other tests opening two menus back-to-back in the same render should also wait on target `menuitem`s rather than bare `getByRole("menu")`. Verified across all 69 frontend test files (`1118` tests) with no other failures.
- **Remaining `bun audit` findings (33):** `devalue` (via `svelte`) and `source-map-js` (dev tooling via `vite` / `tailwindcss` / `jsdom`) have no semver-compatible upstream resolution yet; revisit in a dedicated major-upgrade change if needed.
