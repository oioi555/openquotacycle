## 1. Remove host ccusage spawn

- [x] 1.1 Delete `inject_ccusage`, `patch_ccusage_wrapper`, and the bunx→npx runner chain from `src-tauri/src/plugin_engine/host_api.rs` / `runtime.rs`, and verify `rg ccusage src-tauri/src` is empty.
- [x] 1.2 Delete `scripts/bump-ccusage-version.mjs` and the `ccusage:bump` script in `package.json`, and verify those paths are gone.

## 2. Remove Claude and Codex tiles

- [x] 2.1 Remove Today / Yesterday / Last 30 Days from `plugins/claude` and `plugins/codex` (plugin.js, plugin.json, tests) and from `plugins/test-helpers.js`, and verify those probes no longer call `host.ccusage` or emit those labels.
- [x] 2.2 Drop the ccusage section from `docs/plugins/api.md` and align `openspec/specs/claude-quota/spec.md` so env-only Claude credentials emit no local spend tiles; verify `rg ccusage docs/plugins plugins/claude plugins/codex package.json` is empty outside this Change.

## 3. Verification

- [x] 3.1 Run `bun vitest run plugins/claude/plugin.test.js plugins/codex/plugin.test.js` and `cargo test --lib --manifest-path src-tauri/Cargo.toml --quiet`, and verify both pass.
- [x] 3.2 Run `openspec validate remove-ccusage --strict` and `openspec validate --specs --strict`, and verify both pass.
