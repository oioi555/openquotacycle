# copilot-quota Specification

## Purpose

Defines GitHub Copilot credential discovery on Linux and the AI-credit meters Copilot now exposes.

## Requirements

### Requirement: Copilot token sources prefer editor files

The Copilot provider SHALL load a GitHub token from the first usable source in this order: `~/.config/github-copilot/apps.json`, older `~/.config/github-copilot/hosts.json`, GitHub CLI `~/.config/gh/hosts.yml` `oauth_token`, then the GitHub CLI keychain item `gh:github.com`. A previously cached Quotracker token MAY be used only after those prompt-free sources are missing.

#### Scenario: Editor Copilot token is present

- **WHEN** `~/.config/github-copilot/apps.json` contains a non-empty OAuth token
- **THEN** the provider uses that token for the Copilot usage request
- **AND** it does not require `gh auth login`

#### Scenario: Only GitHub CLI file token is present

- **WHEN** the editor Copilot files are missing
- **AND** `~/.config/gh/hosts.yml` contains `oauth_token`
- **THEN** the provider uses that GitHub CLI token

#### Scenario: No Copilot token

- **WHEN** none of the editor, GitHub CLI file, GitHub CLI keychain, or cached tokens are present
- **THEN** the provider reports that the user must sign in to Copilot in an editor or run `gh auth login`

### Requirement: Paid plans meter AI credits

On paid Copilot plans the provider SHALL expose `Credits` from `premium_interactions` as percent used (`100 - percent_remaining`) when that remaining percent is numeric. Extra usage SHALL be exposed when the response includes a usable extra-spend bucket. Chat and Completions SHALL be omitted when those paid-plan buckets are unlimited or absent.

#### Scenario: Paid plan credit percentage

- **WHEN** `quota_snapshots.premium_interactions.percent_remaining` is 70
- **THEN** the provider emits a Credits progress line with used 30 and limit 100

#### Scenario: Free plan chat and completions

- **WHEN** the response includes `limited_user_quotas` and `monthly_quotas` for chat and completions
- **AND** no paid credit percentage is present
- **THEN** the provider emits Chat and Completions count-based progress lines
- **AND** Credits is omitted

#### Scenario: Org-managed seat with no percent quota

- **WHEN** the usage response identifies an org-managed seat and carries a numeric `credits_used` with no allotment
- **THEN** the provider shows Credits as a used count rather than a percentage
- **AND** missing org-billing access does not fail the whole probe
