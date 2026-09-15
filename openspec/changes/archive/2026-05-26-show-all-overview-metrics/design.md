# Design: Show all overview metrics

## Context

The overview page renders provider cards with `ProgressLineList`. It passed `scopeFilter="overview"`, which hides metric lines outside that scope even when those lines are useful in the summary view.

## Approach

Change the overview page to request all metric lines from `ProgressLineList`.

## Implementation Notes

- Replace `scopeFilter="overview"` with `scopeFilter="all"` in `src/pages/overview.tsx`.
- Update the overview page test to expect all lines to be visible.
- Do not change provider detail behavior.
- Do not change `ProgressLineList` filtering semantics globally.

## Affected Files

- `src/pages/overview.tsx`
- `src/pages/overview.test.tsx`

## Risks

- Providers with many metric lines may make overview cards taller.
- The summary view may become visually denser.

## Verification

- Run overview page tests.
- Run the full frontend test suite before committing.
