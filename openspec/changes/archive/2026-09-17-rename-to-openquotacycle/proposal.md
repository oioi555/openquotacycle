## Why

`quotracker.com` is a parked 2004 stock-tracker domain (NameFind), so the current product name collides with an unrelated brand. The app is two days past first release, with no GitHub stars and an AUR `quotracker-bin` at 0 votes — this is the cheapest moment to take a clean name. OpenQuotaCycle names the 5-hour cycle and the OpenQuota UX this app already referenced. It is not a successor of OpenUsage or Tuxmeter: OpenUsage is Mac-only, Tuxmeter was its Linux port of the old Tauri UI, OpenQuota is OpenUsage's later UX refresh, and this app kept that old Tuxmeter base, used OpenQuota as a reference (no Mac, never ran OpenUsage), then cut and added its own features.

## What Changes

- Rebrand the app to **OpenQuotaCycle**: `productName`, window title, tray tooltip/title/menu, About, notify `app_name`, Window Starter prompt, User-Agent `Quotracker` → `OpenQuotaCycle`, README, LICENSE copyright line (Robin Ebers / Andrea Debernardi retained).
- README logotype wordmark `quotracker` → `OpenQuotaCycle` (keep the leftover-meter mark). Edit the existing hero PNGs' titlebar caption only (`Quotracker` → `OpenQuotaCycle`); do not recapture the UI.
- **BREAKING**: crate/binary `quotracker` → `openquotacycle` (lib `openquotacycle_lib`), `package.json` name, Tauri identifier `io.github.oioi555.quotracker` → `io.github.oioi555.openquotacycle`.
- **BREAKING**: plugin host globals `__quotracker_plugin` / `__quotracker_ctx` → `__openquotacycle_plugin` / `__openquotacycle_ctx`. No compatibility aliases.
- Point self-references at `oioi555/openquotacycle` (changelog API, About, markdown PR/commit links). The GitHub repo rename (`gh repo rename`) is after this change is archived and committed; old URLs keep GitHub's redirect.
- First-run copy of app data from `io.github.oioi555.quotracker` into the new identifier dir. Config dir `~/.config/quotracker/` is read as fallback (and copied once) into `~/.config/openquotacycle/`.
- Local PKGBUILD `openquotacycle-git`; AUR `openquotacycle-bin` unpacks the new `.deb` and `replaces`/`conflicts` the Quotracker package names. Stop publishing `quotracker-bin`.

## Capabilities

### New Capabilities

- `settings-migration`: first-run copy of user data and XDG config from the Quotracker paths into the OpenQuotaCycle paths so the identifier/config rename does not reset settings.

### Modified Capabilities

- `app-build-runtime`: release binary, product name, and plugin host globals follow OpenQuotaCycle. Telemetry stays absent (already removed); this change does not add or restore it.
- `arch-packaging`: local recipe is `openquotacycle-git`; AUR binary is `openquotacycle-bin` from `oioi555/openquotacycle` releases; Quotracker package names are replaced, not co-installed.
- `linux-window`: tray title, tooltip seed, and About menu item say OpenQuotaCycle.
- `window-starter`: the fixed start prompt names OpenQuotaCycle.
- `openrouter-key-quota`: saved OpenRouter key file lives under `~/.config/openquotacycle/`.

## Impact

- `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src-tauri/src/main.rs`, tray/notify/config/plugin_engine, new migration module.
- Bundled plugins (`__quotracker_*`, User-Agent), plugin tests, `docs/plugins/*`.
- Frontend About/changelog/tray/settings/Window Starter strings and tests.
- `docs/assets/logo-{light,dark}.svg` wordmark, `hero-{light,dark}.png` (Overview + Timeline, both themes).
- `package.json`, `aur/PKGBUILD`, `aur/quotracker-bin/` → `aur/openquotacycle-bin/`, `.gitignore` AUR un-ignore patterns, `.github/workflows/aur.yml`, README, data-path docs.
- Code points at `oioi555/openquotacycle`; `gh repo rename` is a follow-up after this change lands. AUR `quotracker-bin` stops receiving updates.
- Invisible leftover: Copilot Secret Service item stays `Quotracker-copilot` so saved tokens keep working.
- Out of scope: new leftover-meter mark / app icon / favicon, local checkout directory name, buying `quotracker.com`.
