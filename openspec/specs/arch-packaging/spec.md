# arch-packaging Specification

## Purpose
Defines the local `quotracker-git` makepkg recipe, the AUR `quotracker-bin` package that unpacks GitHub Release `.deb` files, and how the packaged app resolves persisted provider environment variables from shell config.
## Requirements
### Requirement: Fork Arch package metadata

The project SHALL provide an Arch package recipe under the package name `quotracker-git`. The recipe SHALL describe a local `makepkg` build of Quotracker and SHALL NOT claim to be a Tuxmeter package or a Tuxmeter replacement.

#### Scenario: Fork package identity

- **WHEN** a maintainer reviews `aur/PKGBUILD`
- **THEN** `pkgname` is `quotracker-git`
- **AND** the recipe points at `https://github.com/oioi555/quotracker`
- **AND** the recipe is described for local `makepkg` use rather than AUR publication

#### Scenario: Fork package replacement semantics

- **WHEN** a user installs the package with pacman
- **THEN** the package provides and conflicts with `quotracker`
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
- **AND** that recipe is not the AUR `quotracker-bin` package

### Requirement: AUR binary package tracks GitHub Releases

The project SHALL publish `quotracker-bin` to the AUR from the GitHub Release `.deb` after a version tag creates that release. The AUR recipe SHALL unpack the `.deb` `data.tar.*` and SHALL provide/conflict `quotracker` only. Publication SHALL use SSH to `aur.archlinux.org` and SHALL skip when `AUR_SSH_PRIVATE_KEY` is unset.

#### Scenario: Release publishes quotracker-bin

- **WHEN** GitHub Release `vMAJOR.MINOR.PATCH` includes a Linux `.deb` asset
- **AND** `AUR_SSH_PRIVATE_KEY` is configured
- **THEN** `aur/quotracker-bin/PKGBUILD` is updated to that version and checksum
- **AND** the workflow pushes `PKGBUILD` and `.SRCINFO` to `quotracker-bin` on the AUR

#### Scenario: Missing AUR SSH key skips publication

- **WHEN** `AUR_SSH_PRIVATE_KEY` is unset
- **THEN** the GitHub Release still succeeds
- **AND** the AUR job does not fail the publish pipeline

### Requirement: Arch package does not depend on Ayatana AppIndicator

The Arch package runtime depends SHALL include the WebKitGTK and GTK3 libraries required for the main window and SHALL NOT list `libayatana-appindicator`, `libappindicator-gtk3`, or `libsecret`. Secret Service access goes through D-Bus (`oo7`); the package SHALL NOT depend on `secret-tool` / `libsecret-tools`.

#### Scenario: PKGBUILD runtime depends

- **WHEN** a maintainer reviews `aur/PKGBUILD` `depends`
- **THEN** `webkit2gtk-4.1` and `gtk3` are present
- **AND** `libayatana-appindicator` is absent
- **AND** `libsecret` is absent

### Requirement: Packaged app env compatibility

The project SHALL keep whitelisted provider environment variables available to packaged GUI launches when the user has persisted them in supported shell configuration.

#### Scenario: Source-tree and packaged launches resolve the same provider key

- **WHEN** a user persists `ZAI_API_KEY` in supported shell config such as `~/.zshrc`
- **AND** launches the app from an installed package instead of an interactive terminal
- **THEN** `host.env.get("ZAI_API_KEY")` resolves the persisted value
- **AND** provider plugins that depend on that key do not fail solely because the app was launched from the packaged desktop entry

### Requirement: Arch package manager owns installed updates

The Arch package SHALL NOT replace its installed executable through an in-app self-updater; pacman or an AUR helper SHALL own upgrades and package state.

#### Scenario: Installed update is available

- **WHEN** a newer Quotracker package is available
- **THEN** the user updates it through pacman or an AUR helper
- **AND** the running app does not download or install a replacement executable
