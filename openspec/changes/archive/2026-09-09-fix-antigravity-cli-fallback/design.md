## Context

`plugins/antigravity/plugin.js` currently asks the host to discover only `language_server_linux` and requires a marker plus a CSRF flag. The Antigravity CLI runs as the markerless `agy` process and exposes the same local Connect-RPC service without those flags. The host discovery implementation in `src-tauri/src/plugin_engine/host_api.rs` currently cannot represent that source.

The plugin already parses OAuth credentials from both Linux SQLite record formats and contains a Google OAuth refresh implementation. OpenQuota uses a Rust provider with its own keyring and refresh flow, but its application crate is not a reusable dependency for the JS plugin runtime. More importantly, duplicating that refresh flow would make Quotracker act as another client of Antigravity's OAuth credentials.

## Goals / Non-Goals

**Goals:**

- Discover and use a Linux `agy` CLI local quota server when the GUI language server is unavailable.
- Preserve normal language-server discovery, request context, local-first precedence, and Cloud Code fallback behavior.
- Restrict Cloud Code requests to unexpired access tokens already available locally or in the existing cache.
- Ensure OAuth renewal remains owned by Antigravity or `agy`; Quotracker must not call Google's OAuth token endpoint for this provider.
- Cover both behaviors with regression tests and document the supported sources.

**Non-Goals:**

- No new dependency, credential format, API endpoint, or persisted-data migration.
- No direct reuse or import of OpenQuota's application crate, keyring implementation, or OAuth client credentials.
- No plugin-owned Antigravity OAuth refresh, refresh-token submission, or refreshed-token write-back.
- No removal of the existing local language-server or legacy quota paths.
- No attempt to make unrelated processes masquerading as `agy` valid quota sources.

## Decisions

1. **Extend the existing host discovery contract for markerless CLI processes.** Make the CSRF flag optional and interpret an empty marker list as an intentional markerless lookup. Add an exact executable/process match for `agy` while preserving the existing Linux language-server matching, including the `_x64` variant. The plugin will request `agy` with no marker and no CSRF flag; the returned discovery uses an empty CSRF value for local requests.

   Alternative considered: implement process and port discovery entirely in JavaScript. Rejected because the plugin host already owns process inspection, listening-port lookup, and platform-specific behavior.

2. **Try the regular language server before the CLI.** Keep `language_server_linux` discovery first so the current local behavior and request metadata remain unchanged. If it is absent or its discovered ports cannot provide a usable quota response, try a second markerless `agy` discovery before falling through to Cloud Code. The same summary-first and legacy local endpoint sequence is used for both sources.

   Alternative considered: query Cloud Code before `agy`. Rejected because a reachable local source is authoritative, avoids unnecessary network calls, and matches the existing local-first contract.

3. **Do not duplicate OpenQuota's OAuth refresh flow.** Keep only unexpired access tokens as direct Cloud Code candidates, retain the existing cache read for previously stored valid tokens, and remove the plugin's Google OAuth token endpoint/client credential/refresh write path. When every local source is unavailable and the stored access token is expired, return an actionable error telling the user to start Antigravity or `agy` so the owner of the credential can renew it.

   Alternative considered: port OpenQuota's `auth.rs`/`client.rs` refresh behavior into the plugin or host. Rejected because it duplicates an OAuth client owned by another application and increases policy, credential-handling, and maintenance risk. A direct library dependency is also unsuitable because OpenQuota is a complete Tauri application rather than a provider crate.

4. **Keep credential precedence and local behavior bounded.** A usable current Topic record remains preferred over legacy records, and a non-expired access token remains preferred over cached or metadata candidates. Expired records are never sent as bearer credentials. Local `language_server`/`agy` probing remains ahead of Cloud Code because it lets Antigravity-owned processes handle authentication.

5. **Test the security boundary explicitly.** Add host discovery tests for markerless exact `agy` matching and missing CSRF, plugin tests for regular-LS precedence and CLI fallback, and a plugin regression test proving that an expired current Topic token produces no Google OAuth request. Keep token values confined to test fixtures and do not log credential contents.

## Risks / Trade-offs

- [Risk] A generic `agy` process could be unrelated to Antigravity. → Require the exact executable name, discover a listening port owned by that process, and require a successful supported quota response before returning data.
- [Risk] Changing the host discovery option shape could break existing plugins. → Keep existing string `csrfFlag` calls valid through optional deserialization and change only the markerless/absent-flag behavior.
- [Risk] Multiple local servers may be running. → Preserve regular language-server precedence, probe candidates in deterministic order, and continue to Cloud Code when neither source returns supported data.
- [Risk] Users with an expired access token and no running credential owner cannot get a background refresh. → Return an explicit error directing them to start Antigravity or `agy`, then retry; never send the refresh token from Quotracker.
- [Risk] Existing cache files may contain tokens written by an older plugin version. → Read only unexpired cache entries, keep the existing expiry check, and stop writing new entries from a plugin-owned refresh path.

## Migration Plan

1. Implement the host, plugin, test, and documentation changes, including removal of plugin-owned Google OAuth refresh.
2. Run the focused plugin tests, host Rust tests, full Vitest suite, and plugin bundle validation.
3. Deploy the regenerated bundled plugin; existing credentials and cache files require no migration, and no new Google OAuth client traffic is introduced.
4. Roll back by reverting the change files and bundled plugin output if the CLI endpoint contract changes.
