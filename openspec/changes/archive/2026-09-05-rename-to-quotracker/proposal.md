## Why

The GitHub repo has been detached from the fork network and renamed to `oioi555/quotracker` (user decision: "Quotracker"). The code, packaging, branding, and docs still say Tuxmeter / OpenUsage-fork and point at upstream repos for the updater, changelog, and issue links, which breaks the independence story and would feed users upstream's stale artifacts.

## What Changes

- Rebrand the app to **Quotracker**: `productName`, window title, tray tooltip, About entry, binary/crate name (`tuxmeter` → `quotracker`, lib `tuxmeter_lib` → `quotracker_lib`), `package.json` name, README, TRADEMARK.md, LICENSE copyright line (Robin Ebers' MIT line retained).
- Change the Tauri identifier from `com.debba.tuxmeter` to `io.github.oioi555.quotracker`, and add a one-time first-run migration that carries over user data from the legacy `com.debba.tuxmeter` app directory.
- Point self-references at `oioi555/quotracker`: changelog releases API, issues link in side-nav, PR/commit links in the changelog dialog, and repo link in the About dialog. Present `oioi555` as the current project owner while retaining Tuxmeter/OpenUsage lineage credits.
- Update the local Arch PKGBUILD: package name `quotracker-git`, URL to the new repo, conflict/replace metadata so it cleanly replaces an installed `tuxmeter-oioi555-git`.
- Audit `.github/workflows` (aur.yml still publishes `tuxmeter-bin` with upstream's deb naming) and update naming; AUR publication itself stays deferred.
- Remove inherited Aptabase telemetry and the Tauri self-updater: analytics must not report to an upstream-owned account, and Arch package updates belong to pacman/AUR tooling.

## Capabilities

### New Capabilities

- `settings-migration`: first-run migration of user data (settings, window state) from the legacy `com.debba.tuxmeter` app directory to the new `io.github.oioi555.quotracker` one.

### Modified Capabilities

- `arch-packaging`: the local Arch package is renamed to `quotracker-git` with updated URL and replacement metadata for both upstream packages and the old fork package name.
- `app-build-runtime`: Quotracker does not ship inherited telemetry and delegates installed updates to Arch package tooling instead of self-updating.

## Impact

- `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/src/main.rs`, `src-tauri/src/tray.rs`, `src-tauri/src/lib.rs` (branding/identifier), new migration code in `src-tauri`.
- `src/hooks/use-changelog.ts`, `src/components/side-nav.tsx`, `src/components/changelog-dialog.tsx`, `src/components/about-dialog.tsx`, `src/components/panel-footer.tsx` and their tests (self-references, ownership, and updater UI).
- `package.json`, `bun.lock`, `README.md`, `TRADEMARK.md`, `LICENSE`, `aur/PKGBUILD`, `.github/workflows/aur.yml`, docs that document the legacy data path (`docs/providers/opencode-go.md`).
- Users' data: safely migrated on first run of the new build; nothing deleted.
