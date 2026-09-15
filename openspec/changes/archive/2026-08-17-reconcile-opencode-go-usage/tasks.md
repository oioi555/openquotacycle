# Tasks for Reconcile OpenCode Go usage snapshots

## 1. Investigation

- [x] **1.1** Reproduce the bug by comparing the local OpenCode Go snapshot with the supplied Console snapshot.
- [x] **1.2** Identify the root cause as account-level usage being unavailable while Tuxmeter only sees local SQLite history; confirm the existing anchor correction affects boundaries only.

## 2. Fix

- [x] **2.1** Implement time-scoped `usageCorrection` handling in `plugins/opencode-go/plugin.js`, configure the current Console snapshot, and document the configuration in `docs/providers/opencode-go.md`.
- [x] **2.2** Add regression coverage for active-window correction, expired weekly correction, and the optional rolling reset override in `plugins/opencode-go/plugin.test.js`.

## 3. Verification

- [x] **3.1** Verify the running Tuxmeter snapshot reports Session `0.0%`, Weekly `7.0%`, and Monthly `4.0%`, with matching reset metadata.
- [x] **3.2** Verify local SQLite history is read-only and corrections expire at the rolling, weekly, and monthly boundaries.
- [x] **3.3** Review the implementation and documentation for scope: temporary reconciliation only, no new dependency, API, IPC, or database migration.

## 4. Validation

- [x] **4.1** Run the OpenCode Go plugin tests: 17 passed.
- [x] **4.2** Run the full frontend/plugin suite: 1235 tests passed.
- [x] **4.3** Run TypeScript checking, plugin bundling, production build, and `git diff --check` successfully.
