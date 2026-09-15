## ADDED Requirements

### Requirement: Crossing-go marks leftover to dump across reset

A 5-hour progress line SHALL be crossing-go only when all of these hold at `now`: its `periodDurationMs` is the 5-hour cadence; `resetsAt` is parseable and strictly after `now`; remaining time until reset is greater than 0 and at most 60 minutes; current `used` is strictly below linear expected usage for the elapsed fraction of the period (`used / limit < elapsed / period`); and no weekly-cadence progress line on the same provider has pace status `behind`. Crossing-go SHALL mean dump leftover and work across the reset so unused quota is not wasted. A missing weekly line SHALL NOT block crossing-go. Unstarted 5-hour lines (no parseable `resetsAt`) SHALL NOT be crossing-go. Weekly lines SHALL NEVER be crossing-go.

#### Scenario: Last hour with unused session is crossing-go

- **WHEN** a 5-hour line has 40 minutes until reset, `used` is 10 of 100, and the provider has no weekly line
- **THEN** that line is crossing-go

#### Scenario: Early in the window is not crossing-go

- **WHEN** a 5-hour line has 4 hours until reset and `used` is 0
- **THEN** that line is not crossing-go

#### Scenario: Behind weekly blocks crossing-go

- **WHEN** a 5-hour line would otherwise be crossing-go
- **AND** the same provider has a weekly line whose pace status is `behind`
- **THEN** that 5-hour line is not crossing-go

#### Scenario: On-pace session in the last hour is not crossing-go

- **WHEN** a 5-hour line has 40 minutes until reset and `used` equals linear expected usage
- **THEN** that line is not crossing-go

### Requirement: Unused vs the pace tick is leftover that melts

A started progress line with a parseable reset and a positive period SHALL expose headroom as unused quota relative to the pace tick (`elapsed% - used%`) when `used` is strictly below linear expected usage. That headroom SHALL mean leftover that melts at reset if unused. When the line is crossing-go, leftover SHALL be treated as dump-and-cross so it is not wasted at reset. Usage at or past the tick SHALL NOT expose this accelerator. Unstarted lines (no parseable `resetsAt`) and lines with no positive period SHALL NOT expose it. Weekly and other non-5-hour lines SHALL expose unused-vs-tick and SHALL NEVER be dump-and-cross.

#### Scenario: Unused vs tick early in the window is headroom, not dump

- **WHEN** a 5-hour line has 4 hours until reset and `used` is 0 of 100
- **THEN** headroom is 20% ahead of pace
- **AND** that line is not dump-and-cross

#### Scenario: Last hour unused vs tick is dump leftover and cross

- **WHEN** a 5-hour line has 1 hour until reset and `used` is 0 of 100
- **THEN** headroom is 80% ahead of pace
- **AND** leftover is dump-and-cross

#### Scenario: Usage past the tick is not an accelerator

- **WHEN** a 5-hour line has 1 hour until reset and `used` is 90 of 100
- **THEN** that line does not expose headroom

#### Scenario: Weekly leftover vs tick is headroom, not dump

- **WHEN** a weekly line has 3.5 days until reset and `used` is 0 of 100
- **THEN** headroom is 50% ahead of pace
- **AND** that line is not dump-and-cross

#### Scenario: No reset means no leftover hatch

- **WHEN** a progress line has no parseable `resetsAt`
- **THEN** that line does not expose headroom
