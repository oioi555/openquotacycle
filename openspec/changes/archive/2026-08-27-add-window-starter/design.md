## Context

Quota data currently reaches the React application through periodic plugin probes. Progress lines expose usage, reset time, and period duration, but stale reset times are rendered as `Resets soon` and Z.ai currently normalizes a missing percentage to zero. The Tauri backend has no generic provider command runner, and the Settings page is already dense.

The relevant integration points are `src/hooks/app/use-probe.ts`, `src/lib/settings.ts`, `src/stores/app-preferences-store.ts`, `src/components/side-nav.tsx`, `src/components/app/app-content.tsx`, `plugins/zai/plugin.js`, and the Tauri command registration in `src-tauri/src/lib.rs`.

The supported CLIs installed on the target system all provide non-interactive modes, so an interactive PTY is unnecessary. See `specs/window-starter/spec.md` for observable behavior.

## Goals / Non-Goals

**Goals:**

- Keep activation opt-in, deterministic, bounded, and auditable.
- Reuse current provider probes for detection and confirmation.
- Keep provider selection automatic and avoid per-provider configuration.
- Isolate controls and history on a dedicated application page.

**Non-Goals:**

- Supporting providers other than Claude, Codex, and Z.ai.
- Generic user-defined commands, model selection, PTY automation, or shell execution.
- Recording every quota refresh or retaining full CLI output.
- Guaranteeing activation when a provider delays or omits reset metadata.

## Decisions

### Use a fixed provider runner registry

Map `claude`, `codex`, and `zai` plugin IDs to fixed executable names and argument arrays. Invoke them with Rust `Command` arguments rather than a shell. This is smaller and safer than a custom command editor and matches the supported default tools.

The fixed commands are:

- Z.ai: `zcode --prompt <prompt>`
- Claude: `claude -p <prompt> --model claude-haiku-4-5 --tools "" --max-turns 1 --no-session-persistence`
- Codex: `codex exec --ephemeral --skip-git-repo-check --sandbox read-only -m gpt-5.6-luna -c model_reasoning_effort="none" <prompt>`

Alternative considered: configurable commands and models. Rejected because it expands validation, quoting, billing-route, and support concerns without being needed for the three agreed providers.

### Use existing CLI authentication without handling credentials

Window Starter passes no access token, API key, account identifier, or environment override. Each fixed CLI resolves its own existing user authentication and provider configuration. Tuxmeter records the executable, non-secret arguments, and result, but never CLI environment variables or full output. This preserves the CLIs' authentication boundaries and avoids adding credential storage or authorization paths to Tuxmeter.

### Keep orchestration in a dedicated frontend hook

A `use-window-starter` hook observes latest enabled provider probe results after settings bootstrap. It classifies supported providers, requests executable availability from Tauri, serializes eligible attempts, invokes the fixed runner, and performs provider-only confirmation refreshes. Existing probe state remains the source of current quota truth.

Alternative considered: a permanent Rust background scheduler. Rejected because it would duplicate plugin execution, settings state, and refresh scheduling already owned by the application.

### Require validated idle data

Eligibility requires an exact five-hour progress period, trustworthy usage data, and either an expired reset or zero usage with no reset. Z.ai normalization will stop fabricating zero usage when `percentage` is absent so unknown data cannot trigger a model call. An exhausted weekly line blocks activation.

### Suppress repeat execution with a persisted provider lock

Store each actual attempt immediately, then use its timestamp as a five-hour provider lock regardless of confirmed, unconfirmed, or failed status. This prevents delayed quota propagation, rounded percentages, restarts, and recurring auto-refreshes from causing repeated prompts. Confirmation polls update the same record.

Alternative considered: retry until usage reaches one percent. Rejected because small requests can remain rounded to zero and cause unbounded consumption.

### Persist bounded attempts separately from routine settings

Store the global enabled flag in `settings.json`. Store attempt records in a separate Window Starter store with a 500-record newest-first limit. Do not store probe observations or CLI-unavailable checks. Full stdout is discarded; only bounded error text and process outcome are retained.

### Add a first-class navigation page

Add a `window-starter` application view and a clock/reset icon near Help and Settings. The page owns the global switch, three provider status rows, and activity list. Current status is derived live and not persisted; history is persisted. This avoids adding another section to the crowded Settings page.

## Risks / Trade-offs

- [Provider CLI flags or model IDs change] -> Keep each command in one Rust registry and surface failed exits in activity history.
- [A CLI routes to a different billing account] -> Use only provider-default CLIs and confirm against the matching Tuxmeter quota, while documenting that the first request cannot be pre-verified.
- [Quota API propagation exceeds the confirmation period] -> Mark the attempt unconfirmed and retain the five-hour lock rather than spending more quota.
- [Several providers become eligible together] -> Serialize attempts so only one CLI process and confirmation loop runs at a time.
- [The application closes during an attempt] -> Write the pending record before execution; on restart it still suppresses repeated execution and can be displayed as interrupted/failed.

## Migration Plan

The new setting defaults to false, so existing users experience no background requests. Existing settings require no migration; missing values normalize to the disabled default and empty history. Rollback consists of removing the page, hook, commands, and new store keys; existing extra store data is inert.
