## MODIFIED Requirements

### Requirement: One minimal request starts an eligible window
For each eligible idle episode of a window, the system SHALL execute the selected host runner at most once with the fixed English prompt `OpenQuotaCycle Window Starter request. Respond with only "OK".`. The system SHALL invoke the executable directly without a shell. The native host SHALL build the argument vector from the runner catalog and the `(plugin × runner × window)` pin table. The WebView MUST NOT supply arbitrary argv, environment variables, or credentials.

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
- **THEN** the prompt is `OpenQuotaCycle Window Starter request. Respond with only "OK".`

#### Scenario: WebView cannot supply argv
- **WHEN** the frontend requests a start
- **THEN** the native host receives plugin id, runner id, optional window line, and the prompt
- **AND** it rejects unknown plugin, runner, or plugin/runner pairs without executing a process
