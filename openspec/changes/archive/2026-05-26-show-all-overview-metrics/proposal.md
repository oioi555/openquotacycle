# Bugfix: Show all overview metrics

## Why

The overview page filtered metric lines to `overview` scope only, hiding progress bars (e.g. Claude's Weekly, Cursor's Requests) that users expect to see at a glance.

## What Changes

- `src/pages/overview.tsx`: Change `scopeFilter` from `"overview"` to `"all"`.
- `src/pages/overview.test.tsx`: Update tests to reflect all lines visible.

## Bug Description

The overview page filters metric lines to the `overview` scope, which can hide progress bars that should be visible in the overview.

## Steps to Reproduce

1. Open the overview page with providers exposing non-`overview` scoped metric lines.
2. Inspect the visible progress bars.
3. Some metrics are omitted.

## Expected Behavior

The overview page should show all metric lines relevant to the provider summary.

## Root Cause

The overview page passes `scopeFilter="overview"` to `ProgressLineList`.

## Proposed Fix

Change the overview page to pass `scopeFilter="all"`.
