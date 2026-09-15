## MODIFIED Requirements

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

#### Scenario: No AUR publication assumed

- **WHEN** a maintainer follows the package recipe
- **THEN** the documented path is local `makepkg` usage from the checkout
- **AND** the repository has no GitHub Actions workflow that publishes this PKGBUILD to AUR
