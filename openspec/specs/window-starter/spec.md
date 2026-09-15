# window-starter Specification

## Purpose

Provide an auditable, opt-in mechanism that starts supported idle five-hour quota windows with one minimal provider request and never retries that request automatically.

## Requirements

### Requirement: Global Window Starter control
The system SHALL provide one persisted global control for Window Starter, SHALL default the control to disabled, and SHALL initiate no automatic window-start requests while it is disabled. While the global control is enabled, the system SHALL initiate an automatic window-start request only when that plugin's Window Starter participation for the target window is also enabled. A user-confirmed manual run on the Window Starter page MAY execute while the global control is disabled.

#### Scenario: Feature is disabled by default
- **WHEN** a user has not previously enabled Window Starter
- **THEN** the system shows Window Starter as disabled and does not automatically execute provider CLIs

#### Scenario: User disables the feature
- **WHEN** the user disables Window Starter
- **THEN** the system prevents new automatic window-start attempts while retaining existing activity history

#### Scenario: Provider participation is off
- **WHEN** the global control is enabled and a plugin declares Window Starter but that plugin's stored or default participation for the idle window is disabled
- **THEN** the system does not automatically execute a CLI for that window

### Requirement: Supported providers are detected automatically
The system SHALL treat a plugin as a Window Starter provider only when its manifest declares a `windowStarter` capability. Plugins that omit the field SHALL NOT appear on the Window Starter page and SHALL NOT run a starter CLI. Bundled defaults SHALL be: Claude, Codex, and Z.ai declare the capability with participation enabled by default and first-party runners; Antigravity declares the capability with participation disabled by default for each of its Session and Claude windows; OpenCode Go omits the field.

A declared window SHALL be eligible only when the plugin is enabled, participation for that window is enabled, the latest successful quota data contains that window's five-hour progress line as idle (expired reset, or zero usage with no active reset time), the plugin-declared weekly line for that window is not exhausted, and the selected runner's executable is available. A five-hour line with `used === 0` and a future `resetsAt` SHALL be Active, not idle. The system MUST NOT infer weekly exhaustion from a label substring when the plugin declares a weekly line. The system MUST NOT copy OpenQuota's overlay that paints `Not started` when used is 0% but a reset time is already live.

Antigravity Session and Claude SHALL be independent windows: independent participation, independent eligibility, and independent five-hour locks.

#### Scenario: Supported idle provider is detected
- **WHEN** an enabled plugin that declares Window Starter reports a valid idle five-hour window, participation for that window is enabled, and its selected runner executable is available
- **THEN** the Window Starter page identifies that window as ready without a model name field

#### Scenario: Plugin omits the capability
- **WHEN** OpenCode Go or another plugin has no `windowStarter` field
- **THEN** the Window Starter page does not list it and the system does not execute a CLI for it

#### Scenario: Antigravity defaults stay off
- **WHEN** a user has not stored Window Starter settings for Antigravity
- **THEN** Antigravity Session and Claude windows are not started even if the global control is on and `agy` is on PATH

#### Scenario: Usage data is incomplete
- **WHEN** a provider response lacks a valid usage value or otherwise cannot establish an idle five-hour window
- **THEN** the system treats the window state as unknown and does not execute its CLI

#### Scenario: CLI is unavailable
- **WHEN** an eligible window's selected runner executable cannot be found
- **THEN** the system displays the CLI as unavailable and does not create repeated execution records during quota refreshes

#### Scenario: Weekly quota is exhausted
- **WHEN** a window's plugin-declared weekly progress line is exhausted
- **THEN** the system does not start that five-hour window

#### Scenario: Independent Antigravity locks
- **WHEN** Antigravity Session is locked from a recent attempt and Claude is idle, enabled, and `agy` is available
- **THEN** the system may start the Claude window and MUST NOT treat the Session lock as blocking Claude

#### Scenario: Zero usage with a live reset is active
- **WHEN** a declared five-hour line has used 0 and a future `resetsAt`
- **THEN** the Window Starter page marks that window Active
- **AND** the system MUST NOT treat it as idle or auto-start it again

### Requirement: One minimal request starts an eligible window
For each eligible idle episode of a window, the system SHALL execute the selected host runner at most once with the fixed English prompt `Quotracker Window Starter request. Respond with only "OK".`. The system SHALL invoke the executable directly without a shell. The native host SHALL build the argument vector from the runner catalog and the `(plugin × runner × window)` pin table. The WebView MUST NOT supply arbitrary argv, environment variables, or credentials.

The host runner catalog SHALL be: `claude`, `codex`, `zcode`, `agy`, `opencode`, `hermes`, and `pi`. Allowed runners per bundled plugin SHALL be Claude → `claude` only; Codex → `codex` / `opencode` / `hermes` / `pi`; Z.ai → `zcode` / `opencode` / `hermes` / `pi`; Antigravity → `agy`. Claude's harness SHALL be Claude Code; the system MUST NOT start the Claude provider through OpenCode, Hermes, Pi, or any other third-party client. Z.ai's default harness SHALL be `zcode`; the system MUST NOT start Z.ai through Claude Code. The default runner SHALL be the plugin's first-party CLI (`claude`, `codex`, `zcode`, `agy`).

Model pins SHALL follow the host table. The UI SHALL NOT expose a model text field. When the table pins a model, the runner-specific flag SHALL carry that id. When the table has no model, the host SHALL omit the model flag.

Pin table:

- Claude × `claude`: `--model claude-haiku-4-5`
- Codex × `codex`: `-m gpt-5.6-luna` with the existing ephemeral read-only flags
- Codex × `opencode`: `-m openai/gpt-5.6-luna`
- Codex × `hermes`: `--provider openai-codex -m gpt-5.6-luna`
- Codex × `pi`: `--model openai-codex/gpt-5.6-luna`
- Z.ai × `zcode`: no model flag
- Z.ai × `opencode`: `-m zai-coding-plan/glm-5.3-flash`
- Z.ai × `hermes`: `--provider zai -m glm-5.3-flash`
- Z.ai × `pi`: `--model zai/glm-5.3-flash`
- Antigravity × `agy` × Session: `--model gemini-3.8-flash-low`
- Antigravity × `agy` × Claude: `--model claude-sonnet-4-6`

`agy` MUST NOT receive `--dangerously-skip-permissions`. `opencode` MUST NOT receive `--auto`. `hermes` MUST NOT receive `--yolo`. `pi` MUST NOT receive `--api-key`. `pi` SHALL receive `--no-session --no-tools --no-context-files --no-approve`.

#### Scenario: Z.ai window is started
- **WHEN** Z.ai becomes eligible while Window Starter is enabled and the selected runner is `zcode`
- **THEN** the system executes `zcode --prompt <prompt>` once without a model flag
- **AND** it does not pass `--max-turns`

#### Scenario: Claude window is started
- **WHEN** Claude becomes eligible while Window Starter is enabled
- **THEN** the system executes `claude -p` once with Claude Haiku 4.5, no tools, one maximum turn, and no session persistence
- **AND** it does not invoke OpenCode, Hermes, or Pi for that window

#### Scenario: Claude rejects a third-party harness
- **WHEN** a start is requested for the Claude plugin with runner `opencode`, `hermes`, or `pi`
- **THEN** the native host returns unsupported without spawning a process

#### Scenario: Codex window is started
- **WHEN** Codex becomes eligible while Window Starter is enabled and the selected runner is `codex`
- **THEN** the system executes `codex exec` once using an ephemeral read-only session, GPT-5.6 Luna, no reasoning effort, and no Git repository requirement

#### Scenario: Z.ai rejects Claude Code as a harness
- **WHEN** a start is requested for the Z.ai plugin with runner `claude`
- **THEN** the native host returns unsupported without spawning a process

#### Scenario: Z.ai through OpenCode pins the Coding Plan model
- **WHEN** Z.ai becomes eligible and the selected runner is `opencode`
- **THEN** the system executes `opencode run <prompt> -m zai-coding-plan/glm-5.3-flash` once
- **AND** it does not pass `--auto`
- **AND** it does not use an `opencode-go/` model id

#### Scenario: Z.ai through Pi pins the Coding Plan model
- **WHEN** Z.ai becomes eligible and the selected runner is `pi`
- **THEN** the system executes `pi -p <prompt> --model zai/glm-5.3-flash --no-session --no-tools --no-context-files --no-approve` once
- **AND** it does not pass `--api-key`
- **AND** it does not use an `opencode-go/` or `zai-api/` model id

#### Scenario: Codex through Pi pins Luna on ChatGPT Codex
- **WHEN** Codex becomes eligible and the selected runner is `pi`
- **THEN** the system executes `pi -p <prompt> --model openai-codex/gpt-5.6-luna --no-session --no-tools --no-context-files --no-approve` once
- **AND** it does not use an `openai/` model id

#### Scenario: Antigravity Session window is started
- **WHEN** Antigravity Session becomes eligible and the selected runner is `agy`
- **THEN** the system executes `agy -p <prompt> --model gemini-3.8-flash-low` once
- **AND** it does not pass `--dangerously-skip-permissions`

#### Scenario: Antigravity Claude window is started
- **WHEN** Antigravity Claude becomes eligible and the selected runner is `agy`
- **THEN** the system executes `agy -p <prompt> --model claude-sonnet-4-6` once

#### Scenario: Prompt asks only for OK
- **WHEN** a window start is executed
- **THEN** the prompt is `Quotracker Window Starter request. Respond with only "OK".`

#### Scenario: WebView cannot supply argv
- **WHEN** the frontend requests a start
- **THEN** the native host receives plugin id, runner id, optional window line, and the prompt
- **AND** it rejects unknown plugin, runner, or plugin/runner pairs without executing a process

### Requirement: Activation is confirmed without model retries
After a CLI attempt, the system SHALL refresh only the provider's quota data for a bounded confirmation period. It SHALL mark the attempt confirmed when that window's five-hour reset moves into the future, including when rounded usage is still 0%, and SHALL mark it unconfirmed when confirmation expires. The system MUST NOT automatically execute another model request for the same idle episode, including when rounded usage remains at zero percent. The five-hour execution lock SHALL key on `(pluginId, window line)` so independent windows on the same plugin do not share a lock. Attempt records that lack a window line SHALL be treated as the plugin's first declared window for lock lookup.

#### Scenario: Reset time advances
- **WHEN** refreshed quota data shows a future five-hour reset for that window after the CLI attempt
- **THEN** the system marks the existing attempt as confirmed and records the new reset time

#### Scenario: Confirmation succeeds at 0% used
- **WHEN** a starter CLI succeeds and a later quota refresh shows used 0 with a future five-hour reset for that window
- **THEN** the system marks the existing attempt as confirmed
- **AND** it does not automatically send another prompt because used is still 0%

#### Scenario: Quota update is delayed or absent
- **WHEN** the bounded confirmation period ends without a future reset time
- **THEN** the system marks the attempt as unconfirmed and does not automatically send another prompt for that idle episode

#### Scenario: CLI execution fails
- **WHEN** the selected CLI exits unsuccessfully or exceeds its execution timeout
- **THEN** the system marks the attempt as failed and suppresses automatic retries for that window for five hours

### Requirement: User-facing cadence names use 5-hour

The Window Starter Auto-start copy SHALL use `5-hour` as the cadence name (for example `Starts idle 5-hour windows.`). Timeline and Settings SHALL NOT show Window Starter shortcut rows. Duration and lock-interval copy SHALL keep `five hours`. Quota metric labels such as `Five-hour window` SHALL NOT change.

#### Scenario: Window Starter page uses 5-hour

- **WHEN** the Timeline Window Starter section renders
- **THEN** Auto-start copy uses `5-hour windows`
- **AND** it does not use `Five-hour` or `five-hour` as the cadence name

#### Scenario: Timeline shortcut uses 5-hour

- **WHEN** the Timeline screen renders
- **THEN** it does not show a Window Starter shortcut row

#### Scenario: Settings shortcut uses 5-hour

- **WHEN** the Settings screen renders
- **THEN** it does not show a Window Starter shortcut row

### Requirement: Independent Window Starter page

The system SHALL surface Window Starter on the Timeline screen, below the quota reset plots or the empty-state card. There SHALL NOT be a dedicated `window-starter` screen. Settings SHALL NOT include a Window Starter shortcut row. These controls SHALL not be added to the general Settings page. Runner choice SHALL live on Customize L2. Participation SHALL be available on Customize L2 and from each window row's context menu in the Timeline section. The footer SHALL NOT list Window Starter as a tab or Options item.

The global control SHALL be a compact Auto-start card under a Window Starter section title: the card interior holds the Auto-start label, `5-hour` copy, and the toggle. It MUST NOT be a header-row On/Off button.

Starter targets SHALL be grouped into one Overview-style card per plugin, ordered by the provider list order. Each card's title is the plugin name. Plugins that omit `windowStarter` SHALL NOT appear. A plugin with multiple declared windows SHALL occupy one card with a status row per window, in that plugin's declared window order.

Each card SHALL show current window status while collapsed (window line and a status badge). When that window has at least one attempt, the collapsed status row SHALL also show that window's newest attempt as an outcome icon and the compact local `M/D HH:mm` clock. Expanding a card SHALL show at most the newest 5 attempt records for that plugin. Persisted history remains bounded at 500. A global Activity list and an `n / 500` counter SHALL NOT be shown. Collapsed log rows SHALL use an outcome icon without a status word, the runner label (tool name), and the compact local `M/D HH:mm` clock. On a multi-window card the collapsed log title SHALL be the window line, then the runner, not the plugin name. Window, runner, and command SHALL remain in the expanded log details. Collapsed status rows SHALL NOT show the runner name, a reset sentence, or a PATH/executable string.

Each window status row SHALL offer a context menu with that window's participation On/Off, a link to that plugin's Customize L2, a separator, and a manual run action.

#### Scenario: User opens Window Starter

- **WHEN** the user opens the Timeline screen
- **THEN** the Timeline shows Window Starter below the plots or empty state
- **AND** it displays the current state of every plugin that declares `windowStarter`, including Antigravity's Session and Claude windows on one card
- **AND** recent start attempts are available by expanding a card

#### Scenario: User opens Window Starter from Timeline

- **WHEN** the Timeline screen is displayed
- **THEN** it does not show a Window Starter shortcut row
- **AND** it shows the Window Starter section below the plots or empty state

#### Scenario: User opens Window Starter from Settings

- **WHEN** the Settings screen is displayed
- **THEN** it does not show a Window Starter shortcut row

#### Scenario: Global switch uses Overview card chrome

- **WHEN** the Timeline Window Starter section renders
- **THEN** the global control is a titled compact Auto-start card with the toggle inside the card
- **AND** it is not an On/Off button in the page header

#### Scenario: Target list follows provider order

- **WHEN** the provider list order is Antigravity then Claude
- **THEN** the Window Starter cards are Antigravity then Claude
- **AND** Antigravity's card lists Session then Claude windows

#### Scenario: Context menu toggles participation

- **WHEN** the user chooses On/Off from a window row's context menu
- **THEN** that window's Window Starter participation is toggled
- **AND** the global Window Starter switch is unchanged

#### Scenario: Context menu opens Customize L2

- **WHEN** the user chooses the Customize action from a window row's context menu
- **THEN** the system opens that plugin's Customize L2 screen

#### Scenario: Target subtitle is last run only

- **WHEN** a listed window has a prior attempt
- **THEN** the collapsed status row shows that window's newest attempt as an outcome icon and the compact `M/D HH:mm` clock
- **AND** the collapsed status row does not include the runner name
- **AND** the attempt time also appears in that plugin's expanded log list as the compact `M/D HH:mm` clock

#### Scenario: Activity omits status words

- **WHEN** a provider card is expanded and activity is shown
- **THEN** each log row uses an outcome icon without Confirmed, Failed, or similar status text
- **AND** the attempt time uses the compact `M/D HH:mm` clock

#### Scenario: Activity title is provider only

- **WHEN** a multi-window provider card is expanded and activity is shown
- **THEN** each collapsed log title is the window line, then the runner label
- **AND** it does not use the plugin name as the title
- **AND** window, runner, and command remain in the expanded details

#### Scenario: Cards group by provider

- **WHEN** Antigravity declares Session and Claude windows
- **THEN** they appear on one Window Starter card
- **AND** Claude Session appears on a separate Claude card

#### Scenario: Expanded card shows at most five logs

- **WHEN** a plugin has more than five persisted attempts
- **THEN** expanding that plugin's card shows the newest 5
- **AND** the global Activity list is not shown

### Requirement: Activity history is bounded and execution-focused
The system SHALL persist at most 500 Window Starter attempt records. Each record SHALL represent one actual CLI execution and SHALL be updated with its final confirmed, unconfirmed, or failed outcome. Each record SHALL identify the plugin, the window line, the runner, and the command metadata. Routine quota probes, confirmation polls, ineligible checks, and repeated CLI-unavailable observations MUST NOT create history records.

#### Scenario: Confirmation polling occurs
- **WHEN** the system polls quota data multiple times after one CLI execution
- **THEN** the activity history contains one attempt record updated with the final result

#### Scenario: History reaches its limit
- **WHEN** a new attempt would increase persisted history beyond 500 records
- **THEN** the system removes the oldest records and retains the newest 500

### Requirement: Customize L2 owns runner and participation
For a plugin that declares `windowStarter`, Customize L2 SHALL offer Window Starter participation. When the plugin allows more than one runner, it SHALL offer a runner control listing only those runners. When the plugin allows exactly one runner, Customize L2 SHALL show that harness as a fixed label, not a dropdown. Absent stored keys SHALL mean the plugin defaults. The UI SHALL NOT include a model text field or a Hermes provider field. Antigravity SHALL expose independent Session and Claude participation controls labeled as those windows, not as model names. Plugins that omit `windowStarter` SHALL NOT show these controls.

The Window Starter section SHALL appear after Always Visible and On Demand metrics; it is optional. Next to the runner control, Customize L2 SHALL provide an icon-only copy action that copies the selected runner's command with the Window Starter prompt already substituted and POSIX-quoted, so the clipboard text can be pasted into a terminal. When the plugin declares more than one window, the copied command SHALL use the first declared window.

#### Scenario: Claude harness is fixed
- **WHEN** the user opens Customize L2 for Claude
- **THEN** Window Starter participation is offered
- **AND** the harness is shown as Claude Code with no runner dropdown
- **AND** OpenCode, Hermes, and Pi are not listed

#### Scenario: Z.ai runner list
- **WHEN** the user opens Customize L2 for Z.ai
- **THEN** the runner control offers `zcode`, `opencode`, `hermes`, and `pi`
- **AND** Claude Code is not listed
- **AND** there is no model text field

#### Scenario: Antigravity window controls
- **WHEN** the user opens Customize L2 for Antigravity
- **THEN** the page offers independent Session and Claude Window Starter toggles
- **AND** the runner is `agy`
- **AND** the page does not ask for `gemini-3.8-flash-low` or `claude-sonnet-4-6` by name

#### Scenario: OpenCode Go has no starter controls
- **WHEN** the user opens Customize L2 for OpenCode Go
- **THEN** the page does not show Window Starter participation or runner controls

#### Scenario: Window Starter section is last
- **WHEN** the user opens Customize L2 for a plugin that declares `windowStarter`
- **THEN** Always Visible and On Demand appear above the Window Starter section

#### Scenario: Copy runner command
- **WHEN** the user activates the copy action next to the runner
- **THEN** the clipboard contains that runner's command with the starter prompt already substituted and POSIX-quoted
- **AND** the clipboard text does not contain a `<prompt>` placeholder

### Requirement: Stored Window Starter settings restore to plugin defaults
Per-provider display reset and Reset All Customization SHALL delete stored Window Starter participation, runner, and window keys for the affected plugin(s). After those keys are absent, plugin `enabledByDefault`, `defaultRunner`, and per-window defaults SHALL apply. The global Window Starter control SHALL NOT change.

#### Scenario: Per-provider reset restores Antigravity off
- **WHEN** the user enabled Antigravity Session Window Starter and then resets that provider's customization
- **THEN** Antigravity Session participation returns to disabled
- **AND** the global Window Starter switch is unchanged

### Requirement: Manifest windowStarter is optional and non-breaking
A plugin manifest MAY include a `windowStarter` object with `enabledByDefault`, `defaultRunner`, `allowedRunners`, and `windows` (each window has an id, five-hour `line`, and `weeklyLine`; a window MAY set `enabledByDefault`). Unknown or malformed `windowStarter` values SHALL be ignored with a warning and MUST NOT prevent plugin load. Extra unknown manifest fields SHALL continue to be ignored.

#### Scenario: Malformed capability does not break load
- **WHEN** a plugin.json has a `windowStarter` field that is not an object
- **THEN** the plugin still loads
- **AND** it is treated as having no Window Starter capability

### Requirement: Manual Window Starter run is confirmed
The Window Starter page SHALL offer a manual run action on each target row's context menu. Choosing it SHALL show a confirmation dialog. Confirm SHALL execute the same host command as an automatic start for that plugin, runner, and window. Cancel, Escape, and backdrop dismiss SHALL not execute a command.

Manual run SHALL serialize with automatic starts: at most one starter CLI at a time. It SHALL NOT require the global switch to be on, that window's participation to be on, an idle five-hour window, or a cleared five-hour lock. After a manual attempt, the five-hour auto-start lock for that window SHALL still apply. The action SHALL be unavailable while another starter CLI is running or the selected runner executable is not known available.

#### Scenario: Confirm runs the command
- **WHEN** the user confirms a manual run for a listed window
- **THEN** the system executes that window's selected runner once
- **AND** it records an activity history entry

#### Scenario: Cancel does not run
- **WHEN** the user cancels, presses Escape, or clicks the backdrop
- **THEN** no CLI is executed and history is unchanged

#### Scenario: Manual run does not need the global switch
- **WHEN** the global Window Starter switch is off and the user confirms a manual run
- **THEN** the system still executes the selected runner once

#### Scenario: Consecutive Antigravity windows both record
- **WHEN** the user confirms a manual run for Antigravity Session and then for Antigravity Claude after the first CLI exits
- **THEN** both attempts appear in activity history

#### Scenario: Confirmation uses the latest probe snapshot
- **WHEN** a CLI succeeds and a later quota refresh shows a future five-hour reset for that window
- **THEN** the existing attempt is marked confirmed
