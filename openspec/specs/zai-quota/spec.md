# zai-quota Specification

## Purpose

Defines Z.ai GLM Coding Plan quota mapping for current `CREDIT_LIMIT` payloads while keeping the existing Peak Hours badge unchanged.

## Requirements

### Requirement: Percentage windows accept CREDIT_LIMIT and TOKENS_LIMIT

The Z.ai provider SHALL map percentage quota entries whose type or name is `CREDIT_LIMIT` or `TOKENS_LIMIT`. A sub-daily window SHALL become Session. A multi-day window SHALL become Weekly. Missing required usage values SHALL be treated as an invalid response, not as zero usage.

#### Scenario: Current credit session and weekly windows

- **WHEN** the quota `limits` array contains a `CREDIT_LIMIT` entry with unit 3 and percentage 12 and a `CREDIT_LIMIT` entry with unit 6 and percentage 40
- **THEN** the provider emits Session used 12 and Weekly used 40, each with limit 100

#### Scenario: Legacy TOKENS_LIMIT still maps

- **WHEN** the quota `limits` array contains only `TOKENS_LIMIT` entries with the same window units
- **THEN** those entries still map to Session and Weekly

#### Scenario: Required percentage is missing

- **WHEN** a recognized percentage limit is present but its percentage is missing or non-numeric
- **THEN** the provider reports an invalid quota response instead of showing 0 percent

### Requirement: No GLM Coding Plan is an explicit failure

When the quota endpoint returns a successful HTTP status whose body signals no active GLM Coding Plan, the provider SHALL report that the key is valid but has no coding plan. It SHALL NOT render blank Session/Weekly meters as if usage were zero.

#### Scenario: Valid key without a coding plan

- **WHEN** the quota body has `success` false and a message that mentions a coding plan
- **THEN** the provider reports that there is no active GLM Coding Plan

### Requirement: Tool-call TIME_LIMIT stays a count meter

A `TIME_LIMIT` entry SHALL remain the Tool calls count meter (used/limit). Peak Hours classification and badge behavior SHALL stay as specified by `zai-peak-hours` and SHALL NOT change because of credit-limit mapping.

#### Scenario: Web-search count is present

- **WHEN** a `TIME_LIMIT` entry has numeric current and total values
- **THEN** the provider emits a Tool calls progress line with those counts
- **AND** a Peak Hours badge is still emitted on a successful authenticated probe
