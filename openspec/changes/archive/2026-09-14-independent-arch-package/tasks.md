## 1. Package identity

- [x] 1.1 Strip `tuxmeter` / `tuxmeter-bin` / `tuxmeter-oioi555-git` from `aur/PKGBUILD` `provides`/`conflicts`/`replaces`. Keep `quotracker`. Update the header comment. Verify `rg tuxmeter aur/PKGBUILD` is empty.
- [x] 1.2 Delete `.github/workflows/aur.yml`. Update README local Arch notes so they do not claim Tuxmeter replacement. Verify `openspec validate independent-arch-package --strict`.
