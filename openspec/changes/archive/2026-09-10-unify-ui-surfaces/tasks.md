## 1. Tokens

- [x] 1.1 Freeze tray / card / meter / warning tokens in `src/index.css` (light+dark: `--tray`, `--card`, `--meter-track`, brand-green `--meter-fill`, `--meter-warning`, `--meter-critical`, `--warning` / `--warning-bg`, `--card-hover`, `--separator`, `--tertiary`). Map them in `@theme inline`. Verify `rg 'page-accent|sidebar-|chart-[0-9]' src` is empty after dropping unused shadcn tokens
- [x] 1.2 Keep `--radius: 0.5rem` and `--secondary` as the button surface (do not remap to muted text). Verify `bunx vitest run src/svelte/components/ui` still greens outline/secondary buttons

## 2. Surface recipes

- [x] 2.1 Add `@utility` recipes in `src/index.css`: `ui-card`, `ui-card-bordered`, `ui-list`, `ui-nav-row`, `ui-notice`. Verify a page using `class="ui-card"` compiles (`bunx svelte-check --threshold error` on the first converted file, or full check in 6.1)

## 3. Apply recipes

- [x] 3.1 Replace dashboard card class copies with `ui-card` in `overview.svelte`, `provider-card.svelte`, `total-spend.svelte`. Verify `provider-card.test.ts` and overview navigation tests green; no inter-card `Separator`
- [x] 3.2 Replace grouped lists with `ui-list` in `customize.svelte` and `customize-provider.svelte`. Verify customize tests green
- [x] 3.3 Replace bordered sections with `ui-card-bordered` in `settings.svelte`, `cost.svelte`, `resets.svelte`, `window-starter.svelte`, `timeline-section.svelte`. Verify settings / cost / resets tests green
- [x] 3.4 Point Customize and Settings shortcut rows at `ui-nav-row`. Verify both rows render icon + title + subtitle + chevron

## 4. Meter and notice freeze

- [x] 4.1 Keep `ui/progress.svelte` at 2px height, 2px min fill, 2×6px marker, tones from meter tokens. Verify `ui.test.ts` + `metric-line-progress.test.ts` assert brand-green `--meter-fill` for on-pace (not `#1689ef` / provider color)
- [x] 4.2 Keep Alert `warning` variant and PluginError title/detail split on `ui-notice`. Verify `ui.test.ts` warning pin and provider-card error/stale tests use warning tone, not `text-destructive`

## 5. Cross-links

- [x] 5.1 Customize L1 Settings row navigates to Settings. Verify `customize.test.ts`
- [x] 5.2 Settings Customize row navigates to Customize. Verify `settings.test.ts`
- [x] 5.3 Options menu still lists Settings while on Customize. Verify `options-menu.test.ts`

## 6. Close

- [x] 6.1 `bun run test`, `bunx svelte-check --threshold error`, and `openspec validate unify-ui-surfaces --strict` all green. No leftover `rounded-xl bg-card` / `rounded-md border bg-card` copies on the converted screens (`rg 'rounded-(xl|md) (border )?bg-card' src/svelte`)
