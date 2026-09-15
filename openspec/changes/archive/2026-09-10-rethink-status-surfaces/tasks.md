## 1. Host output channels

- [x] 1.1 Replace badge metrics with `PluginOutput.statuses: { text, tone }[]` (`positive | warning | danger | neutral`) and `error?: string` in `runtime.rs` + `src/lib/plugin-types.ts`. Empty `lines` is success. Thrown strings set `error`. `type: badge` fails the probe. Verify runtime tests
- [x] 1.2 Replace `ctx.line.badge` with `ctx.status.chip({ text, tone })` in `host_api.rs` and `plugins/test-helpers.js`. Verify a plugin using the helper returns the same shape as a raw `statuses` array
- [x] 1.3 Map `output.error` (not Error badge) in `probe-controller` and Rust probe logging. Verify probe-controller tests

## 2. Header chips and notices

- [x] 2.1 Render status chips in `provider-card.svelte` next to plan (compact tone-colored text). Pass `statuses` from Overview. Verify header chip present, absent from body, no placeholder when empty
- [x] 2.2 Render `staleError` as `ui-notice` (PluginError), not the `text-meter-warning` row. Verify provider-card tests

## 3. Customize one list

- [x] 3.1 `getOverviewProgressBarOptions` includes text; `overviewLineOrder` stores progress+text; remove Statistics (`overviewTextLines`). Customize L2 is Always Visible / On Demand + DnD for both. Verify settings + customize-provider tests

## 4. Plugins

- [x] 4.1 Z.ai: Peak Hours as header status; drop Peak Hours and `No usage data` badges; empty quota keeps the chip. Verify `plugins/zai/plugin.test.js`
- [x] 4.2 Grok: omit Extra Usage when cap is 0; positive cap is text `N cap`; stale snapshot uses `Stale` status chip. Update `plugin.json`. Verify `plugins/grok/plugin.test.js`
- [x] 4.3 Claude / Codex / Copilot: drop `No usage data` badges (empty lines OK). Verify those plugin tests
- [x] 4.4 OpenCode Go: throw on auth/usage failure instead of Status badges. Verify `plugins/opencode-go/plugin.test.js`
- [x] 4.5 Mock: 3-channel fixture (Session/Weekly progress, Extra Usage text, one status chip, odd-minute throw). Rename to `Mock`. Drop kitchen-sink badges/empty labels. Verify `plugins/mock/plugin.test.js`

## 5. Cleanup and docs

- [x] 5.1 Remove `metric-line-badge.svelte` and badge branches (metric-line, skeleton, tray-tooltip, window-starter fixture). Use `trash` for the component
- [x] 5.2 Update `docs/plugins/schema.md`, `docs/plugins/api.md`, `docs/providers/grok.md`, `docs/providers/zai.md`
- [x] 5.3 `bun run test`, `bunx svelte-check --threshold error`, `openspec validate rethink-status-surfaces --strict` all green
