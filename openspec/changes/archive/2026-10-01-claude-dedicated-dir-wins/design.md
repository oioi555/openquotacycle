# Design

## Decisions

- `discover_accounts` no longer seeds `seen_uuids` with the primary uuid. Non-primary directories dedupe among themselves as before. After the loop, if the primary uuid is among the kept non-primary uuids, the primary entry is removed from the result.
- `apply_accounts` clones from the `claude` `LoadedPlugin` as today. When the result has no primary entry, it removes the `claude` plugin after inserting the instances, so instances keep the `claude` position.
- Discovery stays startup-only. An account switched into `~/.claude` while the app runs is not re-evaluated; with one dedicated dir per account this does not matter because the primary is always a duplicate.

## Trade-offs

- `claude` settings (order/visibility/Window Starter) are dropped by normalization while the primary is omitted. Acceptable: dedicated cards are the stable identity; the primary is volatile under a switcher.
