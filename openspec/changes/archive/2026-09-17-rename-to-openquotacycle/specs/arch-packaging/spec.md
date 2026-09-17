## MODIFIED Requirements

### Requirement: Fork Arch package metadata

The project SHALL provide an Arch package recipe under the package name `openquotacycle-git`. The recipe SHALL describe a local `makepkg` build of OpenQuotaCycle and SHALL NOT claim to be a Tuxmeter or Quotracker package, except to replace the previous Quotracker package names.

#### Scenario: Fork package identity

- **WHEN** a maintainer reviews `aur/PKGBUILD`
- **THEN** `pkgname` is `openquotacycle-git`
- **AND** the recipe points at `https://github.com/oioi555/openquotacycle`
- **AND** the recipe is described for local `makepkg` use rather than AUR publication

#### Scenario: Fork package replacement semantics

- **WHEN** a user installs the package with pacman
- **THEN** the package provides and conflicts with `openquotacycle`
- **AND** the package replaces and conflicts with `quotracker`, `quotracker-bin`, and `quotracker-git`
- **AND** the package does not provide, conflict with, or replace `tuxmeter`, `tuxmeter-bin`, or `tuxmeter-oioi555-git`

### Requirement: Fork Arch package builds from source

The project SHALL build the Arch package from a checked-out local source tree instead of downloading a prebuilt release artifact.

#### Scenario: Source build flow

- **WHEN** `makepkg` builds the package
- **THEN** the PKGBUILD uses the local checked-out source as its build input
- **AND** runs the existing Bun plugin bundling and Tauri Linux build flow
- **AND** packages the generated Linux bundle output into the pacman package

#### Scenario: No release signing required

- **WHEN** the package is built from PKGBUILD
- **THEN** the build does not require Tauri updater signing secrets or GitHub release artifacts

#### Scenario: Local git recipe is not published to AUR

- **WHEN** a maintainer follows `aur/PKGBUILD`
- **THEN** the documented path is local `makepkg` usage from the checkout
- **AND** that recipe is not the AUR `openquotacycle-bin` package

### Requirement: AUR binary package tracks GitHub Releases

The project SHALL publish `openquotacycle-bin` to the AUR from the GitHub Release `.deb` after a version tag creates that release. The AUR recipe SHALL unpack the `.deb` `data.tar.*` and SHALL provide/conflict `openquotacycle` and replace `quotracker`, `quotracker-bin`, and `quotracker-git`. Publication SHALL use SSH to `aur.archlinux.org` and SHALL skip when `AUR_SSH_PRIVATE_KEY` is unset. The publish workflow SHALL NOT push updates to `quotracker-bin`.

#### Scenario: Release publishes quotracker-bin

- **WHEN** GitHub Release `vMAJOR.MINOR.PATCH` includes a Linux `.deb` asset
- **AND** `AUR_SSH_PRIVATE_KEY` is configured
- **THEN** `aur/openquotacycle-bin/PKGBUILD` is updated to that version and checksum
- **AND** the workflow pushes `PKGBUILD` and `.SRCINFO` to `openquotacycle-bin` on the AUR
- **AND** the workflow does not push to `quotracker-bin`

#### Scenario: Missing AUR SSH key skips publication

- **WHEN** `AUR_SSH_PRIVATE_KEY` is unset
- **THEN** the GitHub Release still succeeds
- **AND** the AUR job does not fail the publish pipeline

### Requirement: Arch package manager owns installed updates

The Arch package SHALL NOT replace its installed executable through an in-app self-updater; pacman or an AUR helper SHALL own upgrades and package state.

#### Scenario: Installed update is available

- **WHEN** a newer OpenQuotaCycle package is available
- **THEN** the user updates it through pacman or an AUR helper
- **AND** the running app does not download or install a replacement executable
