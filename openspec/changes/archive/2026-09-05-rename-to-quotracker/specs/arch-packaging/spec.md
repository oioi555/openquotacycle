## MODIFIED Requirements

### Requirement: Fork Arch package metadata

The project SHALL provide an Arch package recipe for this fork under the package name `quotracker-git`.

#### Scenario: Fork package identity

- **WHEN** a maintainer reviews `aur/PKGBUILD`
- **THEN** `pkgname` is `quotracker-git`
- **AND** the recipe points at `https://github.com/oioi555/quotracker`
- **AND** the recipe is described for local `makepkg` use rather than AUR publication

#### Scenario: Fork package replacement semantics

- **WHEN** a user installs the fork package with pacman
- **THEN** the package declares conflict/provide metadata for upstream `tuxmeter` and `tuxmeter-bin`
- **AND** the package replaces a previously installed `tuxmeter-oioi555-git` (the old fork package name) instead of colliding with it

## ADDED Requirements

### Requirement: Arch package manager owns installed updates

The Arch package SHALL NOT replace its installed executable through an in-app self-updater; pacman or an AUR helper SHALL own upgrades and package state.

#### Scenario: Installed update is available

- **WHEN** a newer Quotracker package is available
- **THEN** the user updates it through pacman or an AUR helper
- **AND** the running app does not download or install a replacement executable
