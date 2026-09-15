## Context

Overview already stacks a compact Timeline card above provider meters. The user reads the 5-hour pace tick every day. Crossing two session windows only works in the last stretch of a started 5-hour period when weekly is not already behind. Today the tick is always muted foreground and Timeline card items are always muted, soonest-first. The Timeline card body tints on hover but does not lift like provider cards.

## Goals / Non-Goals

**Goals:**
- One predicate for crossing-go (dump leftover and cross the reset).
- Same meter-fill emphasis on the Overview 5-hour tick and the Timeline card 5-hour remaining time.
- Timeline card 5-hour crossing-go items sort first.
- Overview meters with a reset show unused quota that has pulled away from the pace tick as a hatch (it melts at reset). Last-hour 5-hour leftover is dump-and-cross and glows on the hatch.
- Timeline card body uses the same pressable hover lift as provider cards.

**Non-Goals:**
- Desktop / tray notifications.
- Changing Timeline-tab plots or Window Starter.
- A second usage bar, 2x badge, or Overview plot axis.
- Restyling Weekly row items (no dump-and-cross, no GO pill).
- Scaling the 60-minute dump band with leftover size.
- Glowing the pace tick (it stays crisp).

## Decisions

- **Accelerator is unused vs the tick.** Headroom = `elapsed% - used%`. Fill left of the tick means more can be burned. Usage at or past the tick is not an accelerator.
- **Last hour is dump leftover and cross.** 60 minutes is the sit-down band so leftover does not vanish at reset. Not “enough time to dump a full 5-hour cap at linear pace.”
- **Hatch anywhere a meter resets.** Any started resetting meter ahead of the tick: fill→tick (solid fill clipped so leftover past the tick is hatch only). Crossing-go (5-hour last hour only): leftover (used: fill→100%; left: 0→leftover). Hatch is unmixed `#00e676` (`--meter-headroom`), not muted `--meter-fill` and not warning yellow. Weekly never dump-and-cross. Dollar meters with no `resetsAt` stay unhatched.
- **Glow is hatch-only, and only when GO.** `--meter-headroom-glow` sits on `meter-headroom-hatch-go`. Light uses dedicated `#00a152` so the halo is not a foggy neon on a pale card; dark uses unmixed `#00e676`. Idle hatch has no glow. Mixing glow with `--foreground` made a muddy olive — do not do that.
- **Tick stays crisp.** Idle 2×12px muted. Go 4×16px `--meter-fill` at full opacity, no box-shadow.
- **Any weekly `behind` on the provider blocks GO.** Do not pair Session vs Claude weeklies. No weekly line means no block.
- **Display-mode independent predicate.** Compare `used` to linear expected. Budget slice follows display mode.
- **Timeline card go is a pill.** Remaining time stays the label. 5-hour tooltips add ahead-of-pace / dump-and-cross. Weekly omits that.
- **Hero is the 5-hour go chip, not a larger card.** Chrome and weekly row stay as they are, except the card body gets `ui-pressable` so hover lift matches provider cards.

## Risks / Trade-offs

- [Several providers go at once] → sort go first; still a horizontal strip.
- [Starter idle with no `resetsAt`] → not go (no crossing to hit); no hatch.
- [Left display inverts the bar] → predicate ignores display mode so left mode does not false-trigger; clip fill at the hatch so leftover is not painted as kept quota.
- [Light neon halo on a pale card] → dedicated darker green `#00a152`, hatch only.

## Migration Plan

None.

## Open Questions

None.
