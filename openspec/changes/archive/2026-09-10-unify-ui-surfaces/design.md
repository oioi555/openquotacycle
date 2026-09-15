## Context

See proposal.md Why. Working tree already has the visual freeze (6px radius, 2px meters, brand-green fill, warning Alert, Customize ↔ Settings rows). What is missing is a single token + surface layer; screens still re-encode `rounded-md bg-card …` locally. Tailwind v4 + bits-ui stay. Abandoned `dashboard-visual` (12px / 5px / blue) is not restored.

## Goals / Non-Goals

**Goals:**
- One token map in `src/index.css` for tray, card, meter, warning.
- Four `@utility` recipes (`ui-card`, `ui-list`, `ui-nav-row`, `ui-notice`) plus `ui-card-bordered` for settings-style sections that already have a stroke.
- Replace copied class strings with those recipes. Behavior unchanged.

**Non-Goals:**
- OpenQuota CSS 4-file port, bits-ui removal, Settings grouped-row + SelectMenu rewrite, Cost aggregation, pixel-audit loop.

## Decisions

- **Recipes as Tailwind `@utility` in `index.css`, not Svelte wrappers.** Screens already compose with `class=`. A `<Surface>` component would add imports without removing bits-ui. Alternative: copy OpenQuota BEM classes — rejected, duplicates Tailwind.
- **Keep shadcn `--secondary` as a button surface.** OpenQuota `--secondary` is muted text; mapping it would recolor outline/secondary buttons. Secondary text stays `muted-foreground`. Add `--tertiary`, `--separator`, `--card-hover`, `--warning` / `--warning-bg` as theme colors. Do not add `--text`; `foreground` is the text token.
- **Drop unused shadcn tokens** (`sidebar*`, `chart-*`, `page-accent`) if no remaining class reference. Keep `destructive` for true destructive actions (Reset All).
- **`--meter-fill` stays the brand mix** `color-mix(in srgb, #00e676 55%, var(--muted-foreground))` in light and dark. Warning / critical stay the OpenQuota yellow / red. Do not go back to `#1689ef` / `#2997ff`.
- **`--radius: 0.5rem`** so `rounded-md` = 6px. Micro pills (switch, progress, checkbox) keep their own radius.
- **`ui-notice` wraps the Alert warning variant.** PluginError keeps title/detail split. Do not invent a second notice component.
- **Fold the current uncommitted visual diff into this change.** eslint / mock chaos / CI stay out unless a recipe test needs them.
- **No "remaining gap audit" task.** The spec above is the freeze. Further OpenQuota diffs are a new change.

## Risks / Trade-offs

- [Risk] Tests pin old utilities (`rounded-xl`, `text-destructive`, `h-1.25`) → Mitigation: update pins in the same recipe-replacement tasks; assert recipes / warning tone / meter token.
- [Risk] `--secondary` collision if someone maps OpenQuota names 1:1 → Mitigation: documented above; grep `bg-secondary` before token edits.
- [Risk] Settings still looks more "card stack" than OpenQuota list → Accepted; rewrite is a later change.

## Migration Plan

Frontend-only. Rollback = revert the change. No persistence or Rust migration.

## Open Questions

None. Settings rewrite and leftover main-spec archaeology stay out.
