## Why

Overview is where the user reads pace. Unused quota that has pulled away from the pace tick is leftover that can still be burned. Near a 5-hour reset that leftover vanishes unless it is dumped and the next window is caught. The tick and Timeline card did not mark that accelerator. The Timeline card also missed the pressable hover lift that provider cards already have.

## What Changes

- A shared crossing-go predicate for a running 5-hour quota: reset within 60 minutes, usage below linear expected pace, and no weekly line on that provider behind pace. That is the dump-and-cross moment.
- Any started resetting meter (5-hour, weekly, monthly, tool-call, billing) hatches unused-vs-tick (fill→tick). Solid fill stops at the tick so leftover past it is hatch only, not kept quota. Meters with no `resetsAt` stay unhatched.
- In the last hour of a 5-hour window the hatch covers leftover to dump (used: fill→100%; left: 0→leftover) and the reset chip says `N% ahead of pace · dump and cross`. Earlier headroom, including weekly, is `N% ahead of pace` only.
- Crossing-go hatch glows with a short halo on the hatch only: light `#00A152`, dark `#00E676`. Idle leftover hatch does not glow. The pace tick never glows.
- Overview 5-hour pace ticks use `--meter-fill` at 4×16 when crossing-go; otherwise they stay the muted 2×12 tick.
- The dashboard Timeline card body uses the same `ui-pressable` hover lift as provider cards. Its 5-hour row uses meter-fill pills on crossing-go items and lists them first. Weekly row styling and order stay unchanged.
- No desktop notification, no Timeline-tab plot changes, no Overview plot axis.

## Capabilities

### New Capabilities

- `crossing-go`: when a 5-hour quota is ready to spend across the upcoming reset.

### Modified Capabilities

- `ui-surfaces`: leftover hatch, crossing-go tick, and GO-hatch glow.
- `ui-navigation`: dashboard Timeline card 5-hour items show crossing-go, sort those items first, and the card body lifts on hover like provider cards.

## Impact

- `src/lib/crossing-go.ts`, Overview `progress` marker, `metric-line-progress`, dashboard `timeline-card` / `quota-timeline/card`, meter tokens in `src/index.css`
- Tests for the predicate, meter hatch/glow, Timeline card order/color/hover
