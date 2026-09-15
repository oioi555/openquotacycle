## 1. Manifest defaults (Rust + schema)

- [x] 1.1 `manifest.rs`: accept per-line `visibleByDefault` on progress and text lines (warn on unsupported line types, never break load) with unit tests; verify `cargo test` green
- [x] 1.2 Drop `primary_order` validation/fields/tests from `manifest.rs` and `primaryCandidates` from `PluginMeta`; verify `cargo test` green

## 2. Frontend defaults + reset

- [x] 2.1 `settings.ts`: visible-set storage + legacy hidden migration + `getOverviewProgressBarOptions` honors manifest marks (stored set wins) + unit tests; verify `bunx vitest run src/lib/settings.test.ts` green
- [x] 2.2 `handleOverviewDisplayReset` applies manifest defaults (order + visibility + statistics) with unit tests; verify settings-controller tests green
- [x] 2.3 Remove `primaryOrder` from all bundled `plugins/*/plugin.json`; verify manifest loader tests + `bun run test` green

## 3. Tray simplification

- [x] 3.1 Tray always installs the static app icon; tooltip reworked to plain text without `getTrayPrimaryBars`; verify tray-controller tests green
- [x] 3.2 Delete `tray-primary-progress.ts` (+ tests), icon render modules, `menubarIconStyle` setting + Settings UI; stale values ignored; verify full suite green

## 5. Statistics unification (text lines join visible sets)

- [x] 5.1 `visibleByDefault` marks + visible sets cover text lines; `hiddenOverviewStatistics` removed (migrated); L2 per-text-line switches; card/overview filter by hidden set
- [x] 5.2 Full suite + typecheck + headless screenshots + breadcrumbs

## 6. Verification

- [x] 6.1 Full suite `bun run test` + `cargo test` + `bun run typecheck` + `openspec validate manifest-defaults-fixed-tray --strict` green
- [x] 6.2 Manual pass: unmarked text hidden by default, L2 per-line switches, reset restores marks; record in breadcrumbs
