## 1. Remove Claude Peak-Hours Integration

- [x] 1.1 Remove the Claude PromoClock URL/constants, payload parsing, color mapping, request helper, and probe call; remove the `Peak Hours` line from `plugins/claude/plugin.json`, then verify no PromoClock request or badge is produced by the Claude plugin tests.
- [x] 1.2 Remove PromoClock fixtures, HTTP mocks, and integration-only test cases from `plugins/claude/plugin.test.js`; add a regression assertion that a normal Claude probe does not call `https://promoclock.co/api/status` while existing usage and no-usage assertions remain passing.

## 2. Align Documentation

- [x] 2.1 Remove the retired peak-hours/PromoClock sections from `docs/providers/claude.md` and remove `peak/off-peak` from the Claude entry in `README.md`; verify no stale production documentation references remain with a targeted text search.
- [x] 2.2 Run `bun run bundle:plugins` and verify the generated Claude plugin manifest/resources no longer declare `Peak Hours` while all other Claude lines remain present.

## 3. Verification

- [x] 3.1 Run `bun run test --run plugins/claude/plugin.test.js` and verify Claude quota, authentication, local usage, no-usage, and no-PromoClock regressions pass.
- [x] 3.2 Run `bun run test` and `openspec validate remove-claude-peak-hours --strict`; verify the full test suite and all Change artifacts pass validation.
