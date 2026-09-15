## Purpose

Defines which AI coding providers Quotracker ships, which unique plugins are removed, and which Linux-only extras stay outside the OpenUsage official set.

## ADDED Requirements

### Requirement: Official provider set matches current OpenUsage

Quotracker SHALL treat the current OpenUsage official providers as its supported set: Antigravity, Claude, Codex, Copilot, Cursor, Devin, Grok, OpenCode, OpenRouter, and Z.ai. The bundled plugin ids for Grok and OpenCode SHALL remain `xai` and `opencode-go`. Devin SHALL be listed as official and unimplemented until a later change.

#### Scenario: README lists the official set

- **WHEN** a user reads the supported-providers list
- **THEN** it names the official OpenUsage set, using OpenCode Go and xAI as the OpenCode and Grok counterparts
- **AND** it does not advertise Amp, Factory, Gemini, JetBrains AI Assistant, Kimi, Kiro, MiniMax, Windsurf, Perplexity, or Synthetic

#### Scenario: Devin is not bundled yet

- **WHEN** the app starts after this change
- **THEN** no Devin plugin is loaded
- **AND** documentation states Devin is official but not implemented

### Requirement: Unique unsupported plugins are not bundled

The production plugin bundle SHALL NOT include Amp, Factory, Gemini, JetBrains AI Assistant, Kimi, Kiro, MiniMax, Windsurf, Perplexity, or Synthetic. The unbundled `mock` plugin MAY remain in the source tree for development. Linux-only extras that are not providers — Window Starter and Z.ai Peak Hours — SHALL remain.

#### Scenario: Production bundle omits unique plugins

- **WHEN** the app is built for release
- **THEN** the bundled plugin directory contains none of the unique unsupported plugin ids
- **AND** `mock` is still excluded from the production bundle

#### Scenario: Stale settings entries are ignored

- **WHEN** saved plugin settings still list a removed plugin id in `order` or `disabled`
- **THEN** the app ignores that id and does not show a provider card for it
- **AND** other saved plugin settings remain intact

### Requirement: Linux extras on official providers stay

Linux credential locations, Z.ai Peak Hours, and Window Starter SHALL remain available on the official providers that already have them. The catalog change SHALL NOT require macOS-only credential sources such as Claude Desktop Safe Storage.

#### Scenario: Official Linux auth still works

- **WHEN** a user is signed into Claude Code, Codex, Cursor, Copilot, Antigravity, GrokBuild, OpenCode Go, or Z.ai on Linux using the existing Linux credential locations
- **THEN** those official providers still authenticate from those locations
