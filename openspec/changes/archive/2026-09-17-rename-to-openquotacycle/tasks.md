## 1. Rust identity and migration

- [x] 1.1 `src-tauri/Cargo.toml`: package `name` → `openquotacycle`, `[lib] name` → `openquotacycle_lib`; update `src-tauri/src/main.rs`; verify `cargo metadata` resolves the new names and the installed binary is `openquotacycle`.
- [x] 1.2 `src-tauri/tauri.conf.json`: `productName` → `OpenQuotaCycle`, window `title` → `OpenQuotaCycle`, `identifier` → `io.github.oioi555.openquotacycle`; verify the config still parses (`bun tauri --help` or equivalent).
- [x] 1.3 Add a small Rust migration module and call it in setup before `settings.json` is first read: copy non-log files from `io.github.oioi555.quotracker` when the new app dir has no `settings.json`; copy `~/.config/quotracker/` to `~/.config/openquotacycle/` when the destination does not exist. Failures log and continue. Verify unit tests cover happy path, already-migrated skip, missing legacy no-op, and unreadable legacy.
- [x] 1.4 Point proxy config at `~/.config/openquotacycle/config.json`. Branding in `tray.rs` (id, title, tooltip seed, About OpenQuotaCycle), `notify.rs` `APP_NAME`, `lib.rs` startup log, `portal_shortcuts.rs` description. Keychain: fallback account `openquotacycle-user`, write labels `OpenQuotaCycle - {service}`; keep service `Quotracker-copilot`. Verify `rg 'Quotracker|quotracker' src-tauri/src` hits only migration source paths, `Quotracker-copilot`, and tests that assert those leftovers. Run `cargo test --lib` for the touched modules.

## 2. Plugin host contract

- [x] 2.1 Rename host globals in `plugin_engine` (`__openquotacycle_plugin`, `__openquotacycle_ctx`) including tests that currently inject `__quotracker_*`. Verify a fixture that only defines `__quotracker_plugin` is reported missing `__openquotacycle_plugin`.
- [x] 2.2 Update every bundled `plugins/*/plugin.js` export and every plugin test helper to the new globals. Change User-Agent `Quotracker` → `OpenQuotaCycle` (codex, grok, openrouter, copilot app UA). Leave `Quotracker-copilot` and provider-specific UAs. Point OpenRouter config reads at `~/.config/openquotacycle/openrouter.json`. Verify `bun run test --run` for `plugins/` is green.
- [x] 2.3 Update `docs/plugins/*`, `docs/providers/*`, `docs/proxy.md`, `docs/capture-logs.md`, `docs/window-starter.md`, `docs/local-http-api.md` product names, plugin globals, config/log paths, and User-Agent examples. Verify those docs say OpenQuotaCycle / `__openquotacycle_plugin` / `~/.config/openquotacycle/` and still document service `Quotracker-copilot`.

## 3. Frontend self-references

- [x] 3.1 Replace user-visible `Quotracker` with `OpenQuotaCycle` in About, Settings about row, tray tooltip/controller, index.html title, Window Starter prompt and error copy. Verify the related vitest files assert the new strings, including `OpenQuotaCycle Window Starter request. Respond with only "OK".`.
- [x] 3.2 Point changelog, About GitHub link, and markdown PR/commit URL bases at `oioi555/openquotacycle`. Verify those tests assert the new repo path.

## 4. Packaging and npm

- [x] 4.1 `package.json` `name` → `openquotacycle`; refresh the lockfile name field with `bun install`. Verify `package.json` and the lockfile name match.
- [x] 4.2 `aur/PKGBUILD`: `pkgname=openquotacycle-git`, url → `https://github.com/oioi555/openquotacycle`, `provides/conflicts` `openquotacycle`, `replaces`+`conflicts` `quotracker` `quotracker-bin` `quotracker-git`. Verify `rg tuxmeter aur/PKGBUILD` is empty and the header comments describe local makepkg only.
- [x] 4.3 Move `aur/quotracker-bin/` to `aur/openquotacycle-bin/` (`mv`). Update PKGBUILD/`aur.yml` for `openquotacycle-bin`, `openquotacycle_<ver>_amd64.deb`, clone/push target `openquotacycle-bin`, and no remaining `quotracker-bin` publish path. Rewrite `.gitignore` `!aur/quotracker-bin/` and `!aur/quotracker-bin/PKGBUILD` to the new dir (keep `!aur/PKGBUILD`). Verify `.github/workflows/aur.yml` never clones `quotracker-bin.git` and `git check-ignore -v aur/openquotacycle-bin/PKGBUILD` does not ignore the recipe.

## 5. Docs, specs surface, grep

- [x] 5.1 README: title OpenQuotaCycle, download/AUR commands, credits: OpenQuota as UX reference, Tuxmeter as the Linux old-Tauri base, OpenUsage as Tuxmeter's Mac original. Verify README has no Quotracker product title, does not say successor/descendant/fork of OpenUsage or Tuxmeter, and still links `deviffyy/OpenQuota`, `debba/tuxmeter`, `robinebers/openusage`.
- [x] 5.2 Replace `docs/assets/logo-light.svg` and `logo-dark.svg` wordmark with outlined `OpenQuotaCycle` (keep the leftover-meter mark, update `aria-label` and viewBox). Rename `src-tauri/icons/Icon.icon/` `quotracker.svg` / `image-name` / layer `name` to `openquotacycle` with no visual change. Verify the SVG `aria-label` is `openquotacycle` and `rg quotracker src-tauri/icons/Icon.icon` is empty.
- [x] 5.3 Edit `docs/assets/hero-dark.png` and `hero-light.png`: replace each titlebar caption `Quotracker` with `OpenQuotaCycle` (same chrome, matching caption color). Do not recapture windows. Verify no titlebar reads Quotracker and README alt text says OpenQuotaCycle.
- [x] 5.4 Repo-wide grep for remaining `quotracker|Quotracker|__quotracker_` excluding `openspec/changes/archive`, this change dir, `node_modules`, `target`, `src-tauri/vendor`, lockfiles, `src-tauri/resources/bundled_plugins`, `aur/pkg`, `.codenomad`, `docs/breadcrumbs.md`, `docs/choices.md`. Fix or consciously accept each hit. Accepted leftovers: `Quotracker-copilot`, migration source paths (`io.github.oioi555.quotracker`, `~/.config/quotracker/`), arch-packaging delta scenario title `Release publishes quotracker-bin`, copilot-quota "cached Quotracker token". Verify that list is the complete remainder.
- [x] 5.5 Mechanical product-name pass on `openspec/specs/**`: Purpose lines and `Quotracker SHALL` / binary-path prose become OpenQuotaCycle / `openquotacycle` except the copilot-quota leftover in 5.4. Do not add new capability deltas for unchanged behavior. Verify remaining `Quotracker` under `openspec/specs` is only that copilot-quota sentence.

## 6. Verification

- [x] 6.1 Full gates: `cargo test --lib`, `bun run test --run`, `bun run typecheck`. All green.
- [x] 6.2 Migration smoke with `bun tauri dev`: Quotracker app dir + config dir present, new dirs absent → first launch copies settings and config; second launch does not overwrite; tray shows OpenQuotaCycle.
