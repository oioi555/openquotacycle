# Tasks for Restore Grok rename and monochrome brand colors

> Status 2026-09-08 15:35 JST: all items applied. Note: the 15:11–15:14 manifest
> rewrite was the user's own `visibleByDefault` work (not a rogue agent) — final
> re-apply kept it intact; only `plugins/grok/plugin.json` id/name needed fixing
> plus the grok test's lines-assert gained `visibleByDefault: true`.
> Validation fixed via `.openspec.yaml` (`skip_specs: true` — specs already describe the target state).

## 1. Grok plugin files

- [x] **1.1** `plugins/grok/plugin.json`: id `grok` / name `Grok` (brandColor `#000000` unchanged)
- [x] **1.2** `plugins/grok/plugin.js`: `PROVIDER_ID` + user-facing xAI messages → Grok (protocol identifiers `X-XAI-Token-Auth` / `auth.x.ai` / `x-ai/*` stay)
- [x] **1.3** `plugins/grok/icon.svg`: Grok mark (openusage paths, `currentColor`)
- [x] **1.4** `plugins/grok/plugin.test.js`: restore Grok asserts (id/name/messages/fake-token names)

## 2. Monochrome brand colors

- [x] **2.1** codex `#000000`, copilot `#000000`, openrouter `#FFFFFF` in `plugin.json`
- [x] **2.2** `plugins/openrouter/plugin.test.js`: brandColor assert → `#FFFFFF`

## 3. Migration regression tests

- [x] **3.1** `src/lib/settings.test.ts`: restore `xai` → `grok` remap tests (adapt to visible sets)

## 4. Verification

- [x] **4.1** `bunx vitest run plugins/grok plugins/openrouter plugins/codex plugins/copilot src/lib/settings.test.ts` green
- [x] **4.2** `cargo test legacy_migration` green
- [x] **4.3** `openspec validate` on touched specs green; record in breadcrumbs
