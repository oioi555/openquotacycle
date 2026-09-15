## ADDED Requirements

### Requirement: Fork Arch package metadata

The project SHALL provide an Arch package recipe for this fork under the package name `tuxmeter-oioi555-git`.

#### Scenario: Fork package identity

- **WHEN** a maintainer reviews `aur/PKGBUILD`
- **THEN** `pkgname` is `tuxmeter-oioi555-git`
- **AND** the recipe is described for local `makepkg` use on the fork rather than AUR publication

#### Scenario: Fork package replacement semantics

- **WHEN** a user installs the fork package with pacman
- **THEN** the package declares replacement/conflict metadata for upstream `tuxmeter` and `tuxmeter-bin`
- **AND** the change does not claim co-installation with upstream packages

### Requirement: Fork Arch package builds from source

The project SHALL build the fork Arch package from a checked-out local source tree instead of downloading a prebuilt release artifact.

#### Scenario: Source build flow

- **WHEN** `makepkg` builds the package
- **THEN** the PKGBUILD uses the local checked-out fork source as its build input
- **AND** runs the existing Bun plugin bundling and Tauri Linux build flow
- **AND** packages the generated Linux bundle output into the pacman package

#### Scenario: No release signing required

- **WHEN** the package is built from PKGBUILD
- **THEN** the build does not require Tauri updater signing secrets or GitHub release artifacts

#### Scenario: No AUR publication assumed

- **WHEN** a maintainer follows the package recipe
- **THEN** the documented path is local `makepkg` usage from the fork checkout
- **AND** the flow does not depend on publishing the PKGBUILD to AUR first

### Requirement: Packaged app env compatibility

The project SHALL keep whitelisted provider environment variables available to packaged GUI launches when the user has persisted them in supported shell configuration.

#### Scenario: Source-tree and packaged launches resolve the same provider key

- **WHEN** a user persists `ZAI_API_KEY` in supported shell config such as `~/.zshrc`
- **AND** launches the app from an installed package instead of an interactive terminal
- **THEN** `host.env.get("ZAI_API_KEY")` resolves the persisted value
- **AND** provider plugins that depend on that key do not fail solely because the app was launched from the packaged desktop entry
