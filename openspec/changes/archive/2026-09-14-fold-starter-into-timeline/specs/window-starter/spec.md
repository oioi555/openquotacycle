## MODIFIED Requirements

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
