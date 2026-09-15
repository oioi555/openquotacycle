# Bugfix: Reconcile OpenCode Go usage snapshots

## Bug Description

OpenCode Go has no account-usage API. Tuxmeter therefore derives usage from local OpenCode SQLite assistant-message costs, while the OpenCode Console reports account-level usage. After the monthly-anchor correction, the local snapshot still diverged materially from the Console: approximately `3.2% / 1.3% / 1.0%` locally versus `0% / 7% / 4%` in the Console for Session / Weekly / Monthly. The rolling reset marker also came from local history and did not match the Console snapshot.

## Steps to Reproduce

1. Use OpenCode Go across sessions or sources not fully represented by the local SQLite history.
2. Compare Tuxmeter's OpenCode Go card with the OpenCode Console usage page.
3. Observe different percentages and, for the rolling window, different reset times.

## Expected Behavior

A manually supplied Console snapshot can reconcile the active Tuxmeter windows without rewriting or fabricating local history. Usage recorded locally after the snapshot continues to accumulate, and the correction does not leak into later quota windows after reset.

## Root Cause

The provider intentionally uses local history because OpenCode does not expose account-level usage. Local observed cost omits remote, other-device, or differently accounted usage. The existing `anchorDate` override corrected only the monthly boundary; it could not correct the usage totals or rolling reset marker.

## Proposed Fix

- Add an optional `usageCorrection` object to the OpenCode Go plugin config.
- Interpret `asOf` plus `sessionPercent`, `weeklyPercent`, and `monthlyPercent` as one Console snapshot.
- Convert target percentages to the published dollar limits, calculate the delta against local cost at `asOf`, and apply that delta only when the snapshot belongs to the active window.
- Continue adding local usage after `asOf`; automatically stop applying each correction at its window reset.
- Support optional `sessionResetsAt` for aligning the rolling reset marker with the same snapshot.
- Record the one-time correction in the user's plugin config and document the semantics.
