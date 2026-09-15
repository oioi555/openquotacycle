# Bugfix: Fix GitHub Copilot keychain authentication

## Bug Description

GitHub Copilot authentication can fail on Linux when Tuxmeter depends on the external `secret-tool` CLI for Secret Service access. The CLI may be missing, unavailable in the runtime environment, or behave differently from direct Secret Service API access.

## Steps to Reproduce

1. Run Tuxmeter on Linux without a reliable `secret-tool` runtime path.
2. Configure or refresh GitHub Copilot credentials.
3. Observe credential lookup/store failure from the plugin host keychain layer.

## Expected Behavior

GitHub Copilot credentials should be read and written through the desktop Secret Service keyring without requiring a separate `secret-tool` executable.

## Root Cause

The host keychain implementation shells out to `secret-tool`, adding a runtime dependency outside the application and making credential access fragile.

## Why

The `secret-tool` CLI dependency makes credential access fragile on Linux. Direct Secret Service API access via `oo7` removes the external dependency and is more reliable.

## What Changes

- Replace `secret-tool` shell-out in `host_api.rs` with `oo7::Keyring` calls
- Add `oo7` dependency to `Cargo.toml`
- Add `sha256Hex` helper to `plugins/test-helpers.js`

## Proposed Fix

Replace the Linux keychain implementation with the `oo7` Secret Service API and keep the existing service/account attribute model. Add the missing `sha256Hex` test helper used by plugin code.
