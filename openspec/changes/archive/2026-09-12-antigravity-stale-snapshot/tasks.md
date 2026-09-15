# Tasks

## 1. Snapshot and keyring (done)

- [x] 1.1 Add snapshot helpers to `plugins/antigravity/plugin.js`: display-only `quota-snapshot.json` in `ctx.app.pluginDataDir` (plan + lines only, no credentials), written after every successful probe with at least one quota line, never overwritten by an empty reading.
- [x] 1.2 Wrap the probe: on any failure, return the snapshot's quota lines with `ctx.status.chip({ text: "Stale", tone: "warning" })`, the same actionable `error` string as the throw path, and re-read conversation spend; rethrow the actionable error when no snapshot exists.
- [x] 1.3 Add the `agy` OS keyring credential source (service `gemini`): read-only access token + expiry (RFC3339Nano-safe parse), deduped against profile tokens, skipped when missing/unreadable/expired; refresh token never read out or persisted.

## 2. Snapshot and keyring tests (done)

- [x] 2.1 Successful probe persists the snapshot and contains only display fields.
- [x] 2.2 With a snapshot present, an expired-token / no-server failure returns the snapshot lines with a `Stale` chip and fresh spend tiles, and makes no network request.
- [x] 2.3 Without a snapshot, the failure still throws an actionable error and still writes nothing.
- [x] 2.4 An empty successful reading does not overwrite an existing snapshot; a corrupt snapshot file is ignored.
- [x] 2.5 Keyring: fresh keyring token is used when profile tokens are expired (no OAuth calls, no keychain writes), expired/missing keyring entries are skipped, and duplicate keyring/profile tokens are sent once.

## 3. Snapshot and keyring docs (done)

- [x] 3.1 `docs/providers/antigravity.md`: snapshot behavior and `agy` keyring source in Overview, Local credentials, Plugin Strategy, and Credential Renewal.
- [x] 3.2 `docs/window-starter.md`: note that a stale Antigravity snapshot can classify a window idle and that confirmation reads the keyring token `agy` refreshes during its run.

## 4. Snapshot and keyring validation (done)

- [x] 4.1 `bun run test plugins/antigravity/plugin.test.js` passes (74 tests; full `plugins/` suite 461 pass).
- [x] 4.2 Confirm no OAuth endpoint call, no keychain write, and no credential write on any path (host_api redaction audit: keychain read logs service name only; snapshot holds display fields only).

## 5. Host wake spawn

- [x] 5.1 Add a bounded host command that runs `agy` with argv exactly `-p` `/quota` `--print-timeout` `1m` (no shell, 60s timeout, no stdout persistence). Verify with a Rust unit test on the argv table and that Window Starter pins are unused.
- [x] 5.2 Skip the spawn when an exact `agy` process is already running and still return a success-to-reprobe result. Verify with a host test that a fake running `agy` does not spawn.
- [x] 5.3 Serialize concurrent wake requests and apply a 15-minute cooldown after a failed spawn. Verify with host or controller tests that a second call joins or no-ops.

## 6. Settings and Customize L2

- [x] 6.1 Persist Auto-start agy (default off) on Antigravity Customize L2 and restore it on Reset All Customization. Verify settings + reset-all tests.
- [x] 6.2 Hide the toggle's spawn path when `agy` is not on PATH (button hidden; auto does not spawn). Verify with a missing-executable fixture.

## 7. Card action and auto re-probe

- [x] 7.1 On Antigravity Stale chip or credential error, with `agy` on PATH, show Start agy (icon + tooltip; auto on does not hide it); click runs wake then `startProbeBatch(["antigravity"])`. Verify provider-card / probe-controller tests.
- [x] 7.2 With auto on, the same Stale/error trigger runs wake then re-probe without a click (including toggle-on while already Stale), and does not write a Window Starter attempt. Verify controller tests.
- [x] 7.3 After a successful wake, the next probe uses the existing plugin path (keyring/Cloud Code); `/quota` stdout is not parsed. Verify no quota parser is added and the re-probe is the existing batch API.

## 8. Docs and validation

- [x] 8.1 Update `docs/providers/antigravity.md` Credential Renewal: `/quota` wake, auto/button, no OAuth. Contrast Window Starter's `-p --model` as quota-consuming. Verify the documented argv matches the host table.
- [x] 8.2 `openspec validate antigravity-stale-snapshot --strict`, focused host tests, `bun run test` for the touched frontend files, and `plugins/antigravity/plugin.test.js` still pass.

## 9. Keyring MIME + print-timeout (post-boot regression)

- [x] 9.1 Patch vendored `oo7` 0.6 so Secret Service `text/plain; charset=utf8` (agy/go-keyring) is readable. crates.io 0.6.0 rejects MIME params; 0.7.0-alpha needs rustc 1.95. Verify host keychain read no longer logs `Invalid content type`.
- [x] 9.2 Keep wake argv `--print-timeout 1m` so `/quota` finishes after silent auth. Verify argv unit tests.

## 10. Stale callout and action (post-boot UI)

- [x] 10.1 Snapshot return includes `error` + lines; host probe keeps both as a card callout (`staleError`). Verify plugin + probe-controller + runtime tests.
- [x] 10.2 Start agy is icon-only refresh + tooltip; auto on does not hide it while Stale; turning auto on while already Stale wakes immediately. Verify provider-card / wake-helper / controller tests.
