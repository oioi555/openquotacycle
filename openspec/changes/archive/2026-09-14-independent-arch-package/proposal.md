## Why

Quotracker is an independent app, not a Tuxmeter package. `aur/PKGBUILD` still `provides`/`conflicts` `tuxmeter` and `tuxmeter-bin` and `replaces` `tuxmeter-oioi555-git`. `.github/workflows/aur.yml` still publishes that recipe as `quotracker-bin` from a GitHub `.deb`, which does not match the local `quotracker-git` source build.

## What Changes

- PKGBUILD identity is only `quotracker-git` / `quotracker`. No Tuxmeter package names.
- Delete the AUR publish workflow until there is a real AUR recipe.
- README local package notes stop claiming Tuxmeter replacement.
- Keep README credits and first-run `com.debba.tuxmeter` data migration; those are history and user-data, not package identity.

## Capabilities

### New Capabilities

- (none)

### Modified Capabilities

- `arch-packaging`: local Arch package is Quotracker-only; it does not provide, conflict with, or replace Tuxmeter packages.

## Impact

- `aur/PKGBUILD`, `README.md`, `.github/workflows/aur.yml`
