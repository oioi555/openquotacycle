# Feature: Add tuxmeter-oioi555-git PKGBUILD

## Summary

Add a local Arch package recipe named `tuxmeter-oioi555-git` so this fork can be built and installed with `makepkg` from a checked-out local source tree instead of downloading a prebuilt `.deb` release artifact. Also make packaged GUI launches resolve persisted provider environment variables the same way source-tree launches do.

## Motivation

This fork does not need upstream-style GitHub Releases or AUR publication just to install it locally. The current `aur/PKGBUILD` is a binary package recipe that expects a published `.deb` release asset. That adds unnecessary release/signing/updater assumptions for a personal fork. The simpler path is a local `makepkg` flow that builds the checked-out fork directly.

During validation, the packaged app exposed a second issue: provider plugins that depend on environment variables (such as Z.ai) worked when launching the binary from an interactive terminal but failed when launching the installed desktop app. The Linux host env bridge only read the current process env, which is not enough for packaged GUI launches when the user persisted API keys in shell config like `~/.zshrc`.

## Proposed Solution

- Replace the current binary-package assumptions with a local source-build Arch package recipe
- Set `pkgname` to `tuxmeter-oioi555-git`
- Keep the recipe oriented around building from the local checked-out fork with `makepkg`
- Build from source with the existing Bun + Tauri build flow
- Package the generated Linux bundle through the PKGBUILD install step
- Mark the package as conflicting with upstream `tuxmeter` / `tuxmeter-bin` because the installed binary and application paths remain the same
- Document that this recipe is for local use and does not assume AUR publication
- Restore shell-based env resolution for whitelisted provider variables so packaged GUI launches can still read persisted keys from supported shell config

## Alternatives Considered

- Keep the existing `.deb`-based PKGBUILD and publish fork-specific GitHub Releases
  - Rejected because it depends on release signing/updater setup that is unnecessary for local pacman-based use
- Convert the recipe into an AUR-oriented `-git` package that clones from GitHub at build time
  - Rejected because the immediate need is local installation from an already checked-out fork, not AUR submission
- Make the fork co-installable with upstream
  - Rejected for this change because it would require renaming the app bundle, binary, desktop entry, icon paths, and likely updater identity in application code, not just PKGBUILD metadata

## Impact

- [x] Breaking changes
- [ ] Database migrations
- [ ] API changes

### Breaking Changes

- The Arch package recipe changes from a binary `.deb` consumer to a local source-build package flow
- The package name changes from `tuxmeter-bin` to `tuxmeter-oioi555-git`
- The package will replace/conflict with upstream package names instead of co-installing beside them
- Whitelisted provider env lookups now fall back to supported login/interactive shell resolution for packaged GUI launches
