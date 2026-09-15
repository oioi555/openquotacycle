## 1. Spark and Luna Reserve probe

- [x] 1.1 Omit Spark additional limits (`codex-spark` / `codex_bengalfox`) in `plugins/codex/plugin.js`, emit at most one weekly `Luna Reserve` from `limit_window_seconds` 604800, ignore five-hour/unknown reserve windows, and verify live-shape, duplicate-weekly collapse, five-hour ignore, and Spark-omit cases with `bunx vitest run plugins/codex/plugin.test.js`.
- [x] 1.2 Drop `Spark`, `Spark Wk`, and `Luna Reserve Wk` from `plugins/codex/plugin.json`, keep unmarked `Luna Reserve`, and verify the manifest test rejects those labels.

## 2. Hidden prefs and docs

- [x] 2.1 Map stored `Luna Reserve Wk` onto `Luna Reserve` in `src/lib/settings.ts` and verify `bunx vitest run src/lib/settings.test.ts`.
- [x] 2.2 Update `docs/providers/codex.md` and the README Codex summary so Spark is gone and Luna Reserve is weekly-only On Demand.

## 3. Verification

- [x] 3.1 Run `bunx vitest run plugins/codex/plugin.test.js src/lib/settings.test.ts src/lib/quota-timeline/card.test.ts` and confirm 140 tests pass.
- [x] 3.2 Run `openspec validate retire-codex-spark-weekly-luna-reserve --strict` and confirm the Change artifacts match the already-landed plugin behavior.
