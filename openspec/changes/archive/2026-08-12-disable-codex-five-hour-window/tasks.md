## 1. Codex account quota classification

- [x] 1.1 Refactor the account-level `rate_limit` path in `plugins/codex/plugin.js` to classify `primary_window` and `secondary_window` by `limit_window_seconds`, emit only a seven-day `Weekly` line, and ignore five-hour or unknown-duration account windows.
- [x] 1.2 Correlate each usage header only with its corresponding classifiable window, fall back to that window's body `used_percent`, and collapse duplicate seven-day candidates deterministically to one Weekly line.
- [x] 1.3 Preserve each emitted Weekly window's reset metadata and API-derived seven-day `periodDurationMs` while leaving `additional_rate_limits` and Reviews behavior unchanged.

## 2. Regression coverage

- [x] 2.1 Update Codex plugin tests that assume an account-level Session fallback to assert the new duration-based behavior.
- [x] 2.2 Add plugin regressions for weekly-in-primary, legacy five-hour-primary plus weekly-secondary, missing or unknown duration including header-only data, and duplicate weekly windows.
- [x] 2.3 Add a quota timeline selection regression proving a Codex output whose account Weekly line precedes model-specific reset lines uses Weekly as its representative and retains the seven-day cadence.

## 3. Documentation and verification

- [x] 3.1 Update `docs/providers/codex.md` to document position-independent duration classification, the disabled five-hour account display, and the weekly-only response shape.
- [x] 3.2 Update the README Codex metric summary to remove the advertised Session metric.
- [x] 3.3 Run the focused Codex plugin and quota timeline test suites, then run the repository's required lint/type/build checks and record any unrelated pre-existing failures.

## 4. Review follow-up

- [x] 4.1 Remove the obsolete Session manifest line, promote Weekly to the Codex primary tray candidate, and add a manifest-derived tray regression test.
- [x] 4.2 Regenerate bundled plugin resources and rerun focused tests, the full test suite, build, and strict OpenSpec validation.
