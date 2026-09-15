## Purpose

Declares per-line default visibility in the plugin manifest so the shown set is explicit, reviewable per provider, and restorable by display reset.

## ADDED Requirements

### Requirement: Manifest marks default-visible lines

An overview progress or text line MAY declare `"visibleByDefault": true`. The dashboard SHALL show marked lines by default; unmarked progress and text lines SHALL default to On Demand (typically ~2 marked of ~7). Unknown values warn and are ignored; the mark on any other line type warns and is ignored. The mark never breaks plugin load.

#### Scenario: Two-bar default like the original

- **WHEN** a manifest marks Session and Weekly `visibleByDefault`
- **THEN** fresh installs show those two bars collapsed and stash the rest behind the expand caret

#### Scenario: Unmarked lines stay hidden

- **WHEN** a manifest leaves a progress line unmarked and the user has no stored visible set
- **THEN** the line is hidden from the collapsed card but remains available behind the expand caret

### Requirement: Display reset restores manifest defaults

Display reset for a provider SHALL restore manifest order and the manifest default-visible set for both progress and text lines. Unmarked lines SHALL return to On-Demand; reset SHALL NOT force all lines or statistics visible.

#### Scenario: Reset restores declared defaults

- **WHEN** the user resets a provider whose manifest marks Session only and the user had enabled Weekly
- **THEN** Weekly returns to On-Demand and order returns to manifest order

#### Scenario: Stored set wins until reset

- **WHEN** the user explicitly enabled lines, creating a stored visible set
- **THEN** the stored set (not manifest defaults) drives the dashboard until display reset deletes it
