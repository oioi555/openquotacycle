## MODIFIED Requirements

### Requirement: Thin verdict meters

Each quota progress line SHALL render a 4px-tall capsule meter. Track color SHALL derive from the foreground on the tray. Fill SHALL encode pace: brand green derived from `#00E676` when on pace, yellow when projected to finish with under 10% spare, red when projected to run out or already exhausted. Fill width SHALL have a 4px minimum for any non-zero value. A 2×12px pace tick MAY overlay the meter and SHALL extend past the meter height so the tick stays readable against the thicker bar. Fill SHALL NOT use the provider brand color. When the line is crossing-go, that tick SHALL use the meter-fill color at full opacity, SHALL be 4px wide and 16px tall, and SHALL NOT carry a glow. When the line is not crossing-go, the tick SHALL use the muted foreground treatment at 2×12px. Weekly meters SHALL NOT use the crossing-go tick. A started meter with a reset and a positive period whose usage is below the pace tick SHALL hatch unused-vs-tick (used mode: fill to tick; left mode: tick to leftover). Solid fill SHALL stop at the hatch so leftover past the tick is not painted as kept quota. That hatch SHALL use unmixed brand green `#00E676` (`--meter-headroom`), not the muted meter-fill mix and not the warning yellow. When that line is crossing-go, the hatch SHALL cover leftover to dump (used mode: fill to 100%; left mode: 0 to leftover), SHALL carry a short glow so leftover reads as dump-and-cross, and the reset chip SHALL name `N% ahead of pace · dump and cross`. Light theme SHALL use dedicated `#00A152` as the glow color; dark theme SHALL use `#00E676`. Idle leftover hatch SHALL NOT glow. When it is ahead but not crossing-go, the reset chip SHALL name `N% ahead of pace` only. Weekly and other non-5-hour meters MAY hatch unused-vs-tick and name ahead of pace; they SHALL NOT dump-and-cross and SHALL NOT glow. Meters with no parseable reset SHALL NOT hatch.

#### Scenario: On-pace fill is brand green

- **WHEN** a quota line is on-pace
- **THEN** the meter fill uses the brand-green meter token, not a provider color and not system blue

#### Scenario: Warning and critical verdicts

- **WHEN** a quota line is projected to finish with under 10% spare
- **THEN** the meter fill is yellow, and when projected to run out or exhausted it is red

#### Scenario: Meter is 4px with a long pace tick

- **WHEN** a quota progress line renders on a dashboard card
- **THEN** the capsule meter is 4px tall
- **AND** a non-zero fill is at least 4px wide
- **AND** when a pace tick is shown and the line is not crossing-go it is 2px wide and 12px tall

#### Scenario: Crossing-go tick uses meter fill without glow

- **WHEN** an Overview 5-hour progress line is crossing-go and shows a pace tick
- **THEN** the tick uses `--meter-fill` at full opacity
- **AND** the tick is 4px wide and 16px tall
- **AND** the tick does not carry a glow

#### Scenario: Idle tick stays muted

- **WHEN** an Overview progress line shows a pace tick and is not crossing-go
- **THEN** the tick uses the muted foreground treatment

#### Scenario: 5-hour meter names dump leftover in the last hour

- **WHEN** an Overview 5-hour progress line is started and has `used` 0 of 100 with 1 hour until reset
- **THEN** the meter shades leftover from fill to 100% in used mode
- **AND** that leftover hatch glows
- **AND** the reset chip names `80% ahead of pace · dump and cross`

#### Scenario: 5-hour meter names unused vs tick earlier in the window

- **WHEN** an Overview 5-hour progress line is started and has `used` 0 of 100 with 4 hours until reset
- **THEN** the meter shades fill to the pace tick in used mode
- **AND** the unused-vs-tick shade uses `--meter-headroom`
- **AND** that hatch does not glow
- **AND** the reset chip names `20% ahead of pace`
- **AND** it does not name dump-and-cross

#### Scenario: 5-hour leftover shade is visible in left mode

- **WHEN** an Overview 5-hour progress line is started, has `used` 0 of 100 with 4 hours until reset, and display mode is left
- **THEN** the meter shades tick to leftover
- **AND** that shade uses `--meter-headroom`, not `--meter-fill` and not `--meter-warning`

#### Scenario: Weekly meter hatches leftover without dump-and-cross

- **WHEN** an Overview weekly progress line is started, has `used` 0 of 100 with 3.5 days until reset, and display mode is left
- **THEN** the meter hatches tick to leftover
- **AND** the reset chip names `50% ahead of pace`
- **AND** it does not name dump-and-cross
- **AND** the tick is not crossing-go
- **AND** the hatch does not glow

#### Scenario: Light GO hatch glow is a dedicated dark green

- **WHEN** an Overview 5-hour progress line is crossing-go on light theme
- **THEN** the leftover hatch glow color is `#00A152`
- **AND** the glow is not mixed with `--foreground`
