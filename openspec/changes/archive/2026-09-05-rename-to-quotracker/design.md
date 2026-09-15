## Context

GitHub side is done: the repo is detached (`isFork: false`) and renamed to `oioi555/quotracker` with the local remote updated. Everything below is the code/packaging catch-up. Current branding lives in `src-tauri/tauri.conf.json` (productName `Tuxmeter`, identifier `com.debba.tuxmeter`, updater endpoint → debba's `latest.json`), `src-tauri/Cargo.toml` (crate `tuxmeter`, lib `tuxmeter_lib`), and hardcoded `debba/tuxmeter` URLs in the frontend (changelog API, issues link, PR/commit links). User data lives under `~/.local/share/com.debba.tuxmeter/` (settings.json via tauri-plugin-store, window state, logs).

## Goals / Non-Goals

**Goals:**
- One coherent rebrand: binary, window, tray, packaging, docs, and self-referential URLs all say Quotracker / `oioi555/quotracker`.
- Users' settings and window state survive the identifier change with zero manual steps.

**Non-Goals:**
- No AUR publication yet (needs AUR account actions; aur.yml gets naming fixes only).
- No first release tagging in this change (the changelog endpoint returns no releases until then).
- No removal of legacy app data (never delete user data).
- Upstream credits for Andrea Debernardi/Tuxmeter and Robin Ebers/OpenUsage remain as project lineage.

## Decisions

- **Identifier `io.github.oioi555.quotracker`**: reverse-DNS convention for a GitHub-hosted app. Changes the app data dir, which is what makes migration necessary.
- **Migration = copy, once, conditionally**: in the Rust setup, before settings are first read, if the new app dir has no `settings.json` and the legacy dir exists, copy every regular file except `logs/`. No marker file needed — the `settings.json` presence check makes it idempotent. Failures log a warning and continue with defaults (never fatal). Alternative considered: migrate only on explicit prompt — rejected, adds UI for a one-time internal move.
- **Crate rename `tuxmeter` → `quotracker` (lib `quotracker_lib`)**: renames the installed binary and Rust log targets; `main.rs` reference updates with it. Log-level store keys and settings keys are unaffected.
- **Changelog/self-URLs → `oioi555/quotracker`** now, accepting an empty changelog until the first release.
- **Arch package manager owns updates**: remove the Tauri self-updater, updater artifacts/signing, and restart-to-update UI. Replacing `/usr/bin/quotracker` from inside an AUR-installed app would bypass pacman ownership.
- **No inherited analytics**: remove Aptabase because its embedded app key reports to the upstream owner's account. No replacement telemetry is added.
- **Local PKGBUILD `quotracker-git`**: `replaces=('tuxmeter-oioi555-git')` added so the old local package name is cleanly swapped out; `provides`/`conflicts` keep covering `tuxmeter`/`tuxmeter-bin`.
- **Docs that expose the data path** (`docs/providers/opencode-go.md`): updated to the new directory name, noting legacy data is migrated.

## Risks / Trade-offs

- [Missed hardcoded "tuxmeter" reference] → repo-wide grep audit (excluding archives/build artifacts) is an explicit task; test suite covers URL assertions.
- [Identifier change orphans data for anyone skipping migration] → covered by the migration requirement and its scenarios.
- [Cargo package rename churns Cargo.lock target names] → mechanical; full build + tests verify.

## Open Questions

None.

### Revision (during verification)

- Cross-repo audit after the rename commit found one genuine leftover: the Kiro plugin still sent `User-Agent: Tuxmeter/<version>`; fixed to plain `Quotracker` matching the other plugins (codex, perplexity, factory, xai, openrouter).
- Consciously accepted `tuxmeter`-named compat surfaces (invisible to users, renaming would break stored data or the plugin runtime contract): `__tuxmeter_plugin` / `__tuxmeter_ctx` / `__tuxmeterAuthError` JS symbols, the `Tuxmeter-copilot` keychain service name (existing saved tokens), and the `~/.tuxmeter` proxy config path. Historical references in README origin story, credits, breadcrumbs/choices logs are intentional.


---

## Revisions

| 日期 | 类型 | 变更描述 | 原因 | 影响 API |
|------|------|----------|------|----------|
| 2026-09-04 | behavior | Removed inherited Aptabase analytics because the embedded app key belonged to upstream OpenUsage; Quotracker now sends no Aptabase events. | An independent project must not send telemetry to the upstream owner's analytics account, and the user chose to remove analytics rather than provision a new account. | - |
| 2026-09-04 | behavior | Removed the inherited Tauri self-updater and signing configuration; Arch package updates are owned exclusively by pacman/AUR tooling. | Self-updating an AUR-installed binary bypasses package ownership, and the inherited updater key could not validate Quotracker releases. | - |
| 2026-09-04 | internal | Replaced predecessor gauge glyphs in the activity bar and macOS Icon Composer source; verified that the Linux native window already publishes the generated Quotracker icon. | Manual visual review found inline SVGs missed by the asset audit. X11 inspection confirmed Tauri already sets `_NET_WM_ICON` before window creation; KWin titlebar-button visibility is desktop configuration and native decorations remain required. | - |
