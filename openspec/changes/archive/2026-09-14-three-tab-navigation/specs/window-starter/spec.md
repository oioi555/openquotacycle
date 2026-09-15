## MODIFIED Requirements

### Requirement: User-facing cadence names use 5-hour

The Window Starter screen heading and the Settings shortcut subtitle SHALL use `5-hour` as the cadence name (for example `Starts idle 5-hour windows with one minimal request.` and `Start idle 5-hour windows`). Duration and lock-interval copy SHALL keep `five hours`. Quota metric labels such as `Five-hour window` SHALL NOT change.

#### Scenario: Window Starter page uses 5-hour

- **WHEN** the Window Starter screen renders
- **THEN** the heading uses `5-hour windows`
- **AND** it does not use `Five-hour` or `five-hour` as the cadence name

#### Scenario: Timeline shortcut uses 5-hour

- **WHEN** the Timeline screen renders
- **THEN** it does not show a Window Starter shortcut row

#### Scenario: Settings shortcut uses 5-hour

- **WHEN** the Settings screen renders the Window Starter shortcut row
- **THEN** the subtitle is `Start idle 5-hour windows`

### Requirement: Independent Window Starter page
The system SHALL provide a dedicated Window Starter navigation destination containing the global control, current states for plugins that declare `windowStarter`, selected-runner executable availability, and activity history. These controls SHALL not be added to the general Settings page. Runner choice SHALL live on Customize L2. Participation SHALL be available on Customize L2 and from each target row's context menu on the Window Starter page. The page's entry point SHALL be the Settings screen's Window Starter shortcut row. The footer SHALL NOT list Window Starter as a tab or Options item. The Timeline screen SHALL NOT include a Window Starter shortcut row.

The global control SHALL use Overview card chrome: a title outside the card, and a card whose interior holds the toggle. It MUST NOT be a header-row On/Off button.

The starter-target list SHALL list every declared window, ordered by the provider list order, then each plugin's declared window order. Plugins that omit `windowStarter` SHALL NOT appear.

Each target row SHALL show the plugin name and window line, a status badge, and when a prior attempt exists a compact local `M/D HH:mm` last-run clock as the subtitle. The subtitle SHALL NOT include the runner name, a reset sentence, or a PATH/executable string.

Activity collapsed rows SHALL show the plugin name only, an outcome icon without a status word, and the attempt time as the same compact local clock. The title SHALL NOT include the window line or runner. Window, runner, and command SHALL remain in the expanded details.

Each target row SHALL offer a context menu with that window's participation On/Off, a link to that plugin's Customize L2, a separator, and a manual run action.

#### Scenario: User opens Window Starter
- **WHEN** the user activates the Window Starter shortcut row on the Settings screen
- **THEN** the system displays the current state of every plugin that declares `windowStarter`, including Antigravity's Session and Claude windows, together with recent start attempts

#### Scenario: User opens Window Starter from Timeline
- **WHEN** the Timeline screen is displayed
- **THEN** it does not show a Window Starter shortcut row

#### Scenario: User opens Window Starter from Settings
- **WHEN** the user activates the Window Starter shortcut row on the Settings screen
- **THEN** the Window Starter screen is displayed

#### Scenario: Global switch uses Overview card chrome
- **WHEN** the Window Starter screen renders
- **THEN** the global control is a titled Overview-style card with the toggle inside the card
- **AND** it is not an On/Off button in the page header

#### Scenario: Target list follows provider order
- **WHEN** the provider list order is Antigravity then Claude
- **THEN** the Window Starter list shows Antigravity Session, Antigravity Claude, then Claude Session

#### Scenario: Context menu toggles participation
- **WHEN** the user chooses On/Off from a target row's context menu
- **THEN** that window's Window Starter participation is toggled
- **AND** the global Window Starter switch is unchanged

#### Scenario: Context menu opens Customize L2
- **WHEN** the user chooses the Customize action from a target row's context menu
- **THEN** the system opens that plugin's Customize L2 screen

#### Scenario: Target subtitle is last run only
- **WHEN** a listed window has a prior attempt
- **THEN** the row subtitle is that attempt's local `M/D HH:mm` clock
- **AND** it does not include the runner name

#### Scenario: Activity omits status words
- **WHEN** activity history is shown
- **THEN** each row uses an outcome icon without Confirmed, Failed, or similar status text
- **AND** the attempt time uses the compact `M/D HH:mm` clock

#### Scenario: Activity title is provider only
- **WHEN** activity history is shown
- **THEN** each collapsed row title is the plugin name
- **AND** it does not include the window line or runner
- **AND** window, runner, and command remain in the expanded details
