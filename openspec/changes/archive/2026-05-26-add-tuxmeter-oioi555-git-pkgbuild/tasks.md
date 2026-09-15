# Tasks for Add tuxmeter-oioi555-git PKGBUILD

## 1. Local package recipe

- [x] **1.1** Change `aur/PKGBUILD` from `tuxmeter-bin` to `tuxmeter-oioi555-git`
- [x] **1.2** Remove the published `.deb` release asset assumption from the package recipe
- [x] **1.3** Add local source-build steps for Bun, plugin bundling, and Tauri Linux packaging

## 2. Local build behavior

- [x] **2.1** Preserve the current installed application layout by packaging the built Linux bundle output
- [x] **2.2** Declare `provides` / `conflicts` so pacman replaces upstream package names instead of attempting co-installation
- [x] **2.3** Avoid release-signing and GitHub Release requirements in the local package build flow

## 3. Verification

- [x] **3.1** Run local `makepkg` validation for the package recipe
- [x] **3.2** Confirm the recipe builds from a checked-out local fork and uses the new package name
- [x] **3.3** Document remaining non-goals, especially that upstream and fork packages are not co-installable yet and that the recipe is not AUR-oriented

## 4. Packaged env compatibility

- [x] **4.1** Reproduce provider env lookup failure from the installed package
- [x] **4.2** Update host env resolution so packaged GUI launches can read persisted shell-based provider variables
- [x] **4.3** Rebuild and confirm the installed package resolves `ZAI_API_KEY` successfully
