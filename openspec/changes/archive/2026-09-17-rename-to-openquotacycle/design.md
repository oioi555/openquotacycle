## Context

See proposal.md for why. Current identity is `productName` Quotracker, identifier `io.github.oioi555.quotracker`, crate/binary `quotracker`, AUR `quotracker-bin` / local `quotracker-git`, plugin globals `__quotracker_plugin` / `__quotracker_ctx`, XDG config `~/.config/quotracker/`. The 2026-09-05 Tuxmeter rename specified a `legacy_migration` module; that file is not in the tree. This change implements migration for the Quotracker paths only (not a second hop from `com.debba.tuxmeter`).

## Goals / Non-Goals

**Goals:**
- One slug everywhere a machine name is required: `openquotacycle`.
- Display name `OpenQuotaCycle` everywhere a person sees the product.
- Settings and XDG config survive the identifier change with a copy-once migration.
- AUR/pacman can replace an installed Quotracker package in one transaction.

**Non-Goals:**
- New leftover-meter mark, app icon, or favicon (no letters; not a Quotracker Q).
- Renaming the local checkout directory.
- Compatibility aliases for `__quotracker_*`.
- Migrating `com.debba.tuxmeter` in this change.
- Buying or parking `quotracker.com`.
- Changing Copilot Secret Service item `Quotracker-copilot`.
- Running `gh repo rename` (do that after this change is archived and the rebrand commit is on the tracked branch).

## Decisions

- **Slug `openquotacycle`, not `open-quota-cycle`.** Matches OpenQuota's smashed form and the agreed display name. Alternative: hyphenated Unix name — rejected; package and identifier would diverge from the product word.

- **Identifier `io.github.oioi555.openquotacycle`.** Same reverse-DNS pattern as today. Alternative: keep the Quotracker identifier to skip data-dir migration — rejected; leftover identity in `~/.local/share/` and desktop-entry hints.

- **Migration = copy, once, never fatal.** Before settings are first read: if the new app dir has no `settings.json` and the Quotracker app dir exists, copy regular files except `logs/`. If `~/.config/openquotacycle/` is missing and `~/.config/quotracker/` exists, copy that tree. Presence of the destination is the idempotency check (no marker file). Alternative: dual-read old paths forever — rejected; two sources of truth. Alternative: prompt the user — rejected; adds UI for a one-time internal move.

- **Plugin globals: hard cut.** Host and every bundled plugin switch to `__openquotacycle_plugin` / `__openquotacycle_ctx`. Tests that only defined the old names fail. Alternative: accept both symbols — rejected; the only user is the maintainer, and a dual contract would linger like `__tuxmeter_*` did.

- **User-Agent `OpenQuotaCycle`.** Plugins that currently send `Quotracker` (codex, grok, openrouter, copilot's app UA) follow the display name. Provider-specific UAs (`antigravity`, `GitHubCopilotChat/...`) stay.

- **Copilot keyring item stays `Quotracker-copilot`.** Invisible to users; renaming it would drop a saved GitHub token. Same class of leftover as the old Tuxmeter keychain name.

- **Keychain account fallback and write labels rename.** `current_keychain_account_from_user_env` falls back to `quotracker-user` only when `$USER` and `id -un` both fail (not a normal desktop session). Last rename already moved `tuxmeter-user` → `quotracker-user` for that reason. Move it to `openquotacycle-user`. Secret Service lookup is `{service, account}` attributes, not the item label, so `Quotracker - {service}` labels become `OpenQuotaCycle - {service}` on new writes without losing existing items. Do not treat `quotracker-user` as a `Quotracker-copilot`-class leftover.

- **Main spec product-name prose is a mechanical apply pass, not extra deltas.** Requirement *behavior* already has deltas (binary path, tray About/tooltip, Window Starter prompt, OpenRouter config path, Arch package identity). Remaining `Quotracker` in `openspec/specs/**` is the product as sentence subject or Purpose. Edit those files in place at apply (OpenSpec allows editing Purpose on the main spec). Do not add nine empty capability deltas. Keep copilot-quota's "cached Quotracker token" — it names the leftover `Quotracker-copilot` service. Keep the arch-packaging delta scenario title `Release publishes quotracker-bin`; `openspec validate --strict` refuses dropping that scenario name.

- **`.gitignore` AUR un-ignore must move with the recipe dir.** `aur/*` ignores the tree; only `!aur/PKGBUILD` and `!aur/quotracker-bin/` / `PKGBUILD` are tracked. After `mv` to `aur/openquotacycle-bin/`, update those negation patterns or the new recipe is silently untracked.

- **Icon Composer source names follow the slug.** `src-tauri/icons/Icon.icon/` is unused on Linux (no visual change). Rename `quotracker.svg` / `image-name` / layer `name` to `openquotacycle` so grep is clean.

- **AUR: new package, old name replaced.** Recipe dir `aur/quotracker-bin/` → `aur/openquotacycle-bin/`. `provides/conflicts` `openquotacycle`; `replaces/conflicts` `quotracker` `quotracker-bin` `quotracker-git`. Workflow clones `openquotacycle-bin` on aur.archlinux.org (first publish creates it) and never pushes `quotracker-bin` again. Alternative: keep publishing the old AUR name as a dummy — rejected; two packages to maintain for one user.

- **GitHub repo rename is after this change, not a change task.** Changelog/About/markdown links use `oioi555/openquotacycle` immediately. `gh repo rename` still happens, but it cannot be a task here: archive requires every task checked, and the rename requires the rebrand commit to already be on the tracked branch. Do it after archive + commit + push. Alternative: leave the GitHub name as quotracker — rejected as public identity, but it is not a gate for this change.

- **Credits stay honest.** README and About credit Tuxmeter as the Linux old-Tauri code base, OpenUsage as Tuxmeter's Mac original, and OpenQuota as the UX reference used because OpenUsage is Mac-only and was never run here. Do not call this app a successor or fork of OpenUsage, Tuxmeter, or OpenQuota.

- **Wordmark and hero title edit; mark stays.** `docs/assets/logo-*.svg` is the meter mark plus a path-outlined `quotracker` word. Replace the word with `OpenQuotaCycle` (outlined paths, not live `<text>`), widen the viewBox, update `aria-label`. Hero PNGs only change the four native title captions: cover `Quotracker` and paint `OpenQuotaCycle` in the same titlebar chrome (match light/dark caption color). The longer name may sit tighter; do not restage Overview/Timeline. Alternative: recapture the running app — rejected; only the title string changed. Alternative: redesign the meter mark — rejected; it is leftover bars, not the old name.

## Risks / Trade-offs

- [Missed `quotracker` / `Quotracker` string] → repo-wide grep excluding `openspec/changes/archive`, this change dir, `node_modules`, `target`, `src-tauri/vendor`, lockfiles, `src-tauri/resources/bundled_plugins`, `aur/pkg`, `.codenomad`, `docs/breadcrumbs.md`, `docs/choices.md`; tests assert new URLs, prompt, tray, globals.
- [GitHub rename before the commit is pushed] → post-change: rename after the rebrand commit is on `main`/`master`, or rename then immediately push so clone URLs match.
- [AUR `openquotacycle-bin` does not exist yet] → first successful publish creates the remote; SSH key still skips when unset.
- [Identifier change orphans data if migration is skipped] → covered by settings-migration scenarios; never delete the old dirs.
- [External plugin on `__quotracker_plugin`] → none known; docs/plugins updated; no alias.

## Migration Plan

1. Land the rebrand on the current GitHub repo (URLs already say `openquotacycle`).
2. After this change is archived and that commit is on the tracked branch: `gh repo rename openquotacycle`; update the local `origin` URL.
3. Next version tag publishes `openquotacycle_*.deb` and, when the AUR SSH key is set, `openquotacycle-bin`.
4. Installed `quotracker-bin` / `quotracker-git` swap via `replaces` on the next `pacman -Syu` / `paru -S openquotacycle-bin`.
5. Rollback: GitHub redirect still serves the old path; do not delete `~/.local/share/io.github.oioi555.quotracker/` or `~/.config/quotracker/`.
