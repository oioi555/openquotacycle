## 1. Rust side (branding, identifier, migration)

- [x] 1.1 `src-tauri/Cargo.toml`: package `name` → `quotracker`, `[lib] name` → `quotracker_lib`; update `main.rs` reference; verify `cargo metadata`/build resolves. Note: installed binary becomes `quotracker`.
- [x] 1.2 `src-tauri/tauri.conf.json`: `productName` → `Quotracker`, `identifier` → `io.github.oioi555.quotracker`; verify config parses (`bun tauri --help` or build).
- [x] 1.3 Implement first-run legacy migration in Rust setup (new small module, e.g. `legacy_migration.rs`): if new app data dir has no `settings.json` and legacy `com.debba.tuxmeter` dir exists, copy regular files (skip `logs/`) into the new dir; log outcome; never fatal. Add unit tests for the copy rules (happy path, already-migrated skip, no-legacy no-op).
- [x] 1.4 Branding strings in `src-tauri/src/tray.rs` (tooltip, "About Tuxmeter") and anywhere else Rust-side "Tuxmeter" appears; verify with `rtk cargo clippy --lib`, `cargo fmt --check`, `rtk cargo test --lib`.

## 2. Frontend self-references

- [x] 2.1 `src/hooks/use-changelog.ts`: releases API repo → `oioi555/quotracker`; update `use-changelog.test.tsx`.
- [x] 2.2 `src/components/side-nav.tsx`: issues link → `https://github.com/oioi555/quotracker/issues`; update `side-nav.test.tsx` (includes issues-URL assertion).
- [x] 2.3 `src/components/changelog-dialog.tsx`: PR/commit/release URL bases → `oioi555/quotracker`; update `changelog-dialog.test.tsx`.
- [x] 2.4 `src/components/about-dialog.tsx`: repo link → `oioi555/quotracker`, name → Quotracker, current owner → `oioi555`; retain Tuxmeter/OpenUsage lineage credits and update `about-dialog.test.tsx`.

## 3. Packaging and docs

- [x] 3.1 `package.json` name → `quotracker`; run `bun install` to refresh `bun.lock` name field.
- [x] 3.2 `aur/PKGBUILD`: `pkgname=quotracker-git`, url → new repo, `replaces=('tuxmeter-oioi555-git')`, keep provides/conflicts for `tuxmeter`/`tuxmeter-bin`; update header comments.
- [x] 3.3 `.github/workflows/aur.yml`: update deb artifact name (`quotracker_<ver>_amd64.deb`) and `pkgname: quotracker-bin`; add comment that AUR publication needs the AUR SSH secret and is deferred.
- [x] 3.4 `README.md`: full rebrand (title, positioning as an independent app with the Linux-native window+tray design rationale, download links → own releases, `yay -S tuxmeter-bin` instruction removed until AUR package exists). `TRADEMARK.md`: Quotracker policy owned by this project. `LICENSE`: add own copyright line above the retained Robin Ebers line.
- [x] 3.5 Update data-path docs (`docs/providers/opencode-go.md`) to the new directory name with a legacy-migration note; repo-wide grep for remaining `tuxmeter|debba|openusage` (excluding `openspec/changes/archive`, `aur/pkg`, `aur/src`, `node_modules`, `target`, `bun.lock`) and fix or consciously accept each hit.

## 4. Verification

- [x] 4.1 Full gates: `rtk cargo clippy --lib` + `cargo fmt --check`, `rtk cargo test --lib`, `bun run test`.
- [x] 4.2 Migration smoke with `bun tauri dev`: with legacy dir present and new dir fresh, first launch copies settings (window position/theme survive); second launch doesn't re-copy; tray shows Quotracker and residency/left-click still work.
- [x] 4.3 Local package build sanity (optional but preferred): `makepkg -si` in `aur/` installs `quotracker-git` and replaces `tuxmeter-oioi555-git`.

## 4b. Icon and brand assets (added after first test round)

- [x] 4b.1 Crop the Quotracker app icon from docs/assets/brand.png (main bars+Q tile), upscale to 1024 with rounded-corner alpha, regenerate all Tauri icons via `bun tauri icon`; verify bundle icons referenced by tauri.conf.json are replaced.
- [x] 4b.2 Extract the black glyph from the monochrome tile as the new 44x44 RGBA tray-icon.png (template-style, matching the previous icon convention).
- [x] 4b.3 Replace public/icon.png (About dialog) with the new mark, replace the stale gauge favicon with a dedicated Quotracker Q monogram, point index.html at `/favicon.svg`, and fix leftover `<title>Tuxmeter`.
- [x] 4b.4 Crop dark/light logotype lockups to docs/assets/logo-dark.png / logo-light.png and add a prefers-color-scheme picture header to README.md.

## 5. Record

- [x] 5.1 Single conventional commit for the rebrand (e.g. `feat!: rename to Quotracker (independent app)`); note the identifier/data migration in the message.

## 6. Independence audit

- [x] 6.1 Remove inherited Aptabase analytics events, native daily-active tracking, permissions, dependencies, and tests.
- [x] 6.2 Remove the Tauri self-updater, updater/relaunch permissions and dependencies, signing configuration, updater UI, and updater-specific release workflow outputs; retain normal GitHub Release artifacts and pacman/AUR updates.
- [x] 6.3 Sync delta specs, update stale current-spec product/binary names, move Code of Conduct enforcement contact to the current owner, and rename non-persistent internal/test markers.
- [x] 6.4 Replace the old inline gauge/app glyph in the activity bar with the standard Home icon; replace the remaining macOS Icon Composer gauge source with the Quotracker Q.
- [x] 6.5 Verify the Linux native window publishes the generated Quotracker icon through `_NET_WM_ICON`; retain native decorations and leave titlebar button rendering to the window manager.
