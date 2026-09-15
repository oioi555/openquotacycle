## Context

Rename-to-quotracker kept `provides`/`conflicts` for upstream Tuxmeter so a local install would swap the old binary. The project is no longer a co-installable or replacement fork. The leftover AUR workflow was written for `tuxmeter-bin` (download a `.deb`, bump checksums) and was only renamed to `quotracker-bin`.

## Goals / Non-Goals

**Goals:**
- Package metadata names only Quotracker.
- Remove the mismatched AUR publish workflow.

**Non-Goals:**
- Publishing to AUR.
- Renaming `__tuxmeter_plugin` / legacy app-dir migration / `~/.tuxmeter` proxy path.
- Changing deb Depends (already WebKit/GTK only).

## Decisions

- **Drop Tuxmeter from `provides`/`conflicts`/`replaces`.** Users who still have `tuxmeter` keep it; Quotracker does not claim that name. `provides`/`conflicts` `quotracker` stay so `-git` does not co-install with a future `quotracker` package.
- **Delete `.github/workflows/aur.yml`.** The current PKGBUILD has empty `source=()` and builds the parent checkout; it cannot be an AUR `quotracker-bin`. A future AUR package needs its own recipe.
- **Keep `pkgname=quotracker-git` and local `makepkg`.** No AUR publication in this change.

## Risks / Trade-offs

- [An old `tuxmeter-oioi555-git` install remains] → uninstall by hand; Quotracker no longer `replaces` it.
- [Someone runs the deleted workflow] → there is no AUR package to update.

## Migration Plan

- `makepkg -si` still installs `quotracker-git` from the checkout.

## Open Questions

None.
