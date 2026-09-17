# Plugin Schema

Plugin structure, manifest format, output schema, and lifecycle.

## Architecture Overview

```
Auto-update timer fires (or app loads)
       |
Tauri command `run_plugin_probes(pluginIds?)`
       |
For each enabled plugin:
  -> Create fresh QuickJS sandbox
  -> Inject host APIs (`ctx.host.*`)
  -> Evaluate plugin.js
  -> Call `probe(ctx)`
  -> Parse returned `{ lines, statuses?, error? }`
       |
Return `PluginOutput[]` to frontend
       |
UI renders via ProviderCard component
```

Key points:

- Each probe runs in **isolated QuickJS runtime** (no shared state between plugins or calls)
- Plugins are **synchronous or Promise-based** (unresolved promises timeout)
- **Auto-update timer** - runs on app load and on configurable interval (5/15 min)

## Plugin Directory Layout

```
plugins/<id>/
  plugin.json    <- manifest (required)
  plugin.js      <- entry script (required)
  icon.svg       <- plugin icon (required)
```

Bundled plugins live under `src-tauri/resources/bundled_plugins/<id>/`.

## Manifest Schema (`plugin.json`)

```json
{
  "schemaVersion": 1,
  "id": "my-provider",
  "name": "My Provider",
  "version": "0.0.1",
  "entry": "plugin.js",
  "icon": "icon.svg",
  "links": [{ "label": "Status", "url": "https://status.example.com" }],
  "lines": [
    { "type": "progress", "label": "Usage", "scope": "overview", "visibleByDefault": true },
    { "type": "text", "label": "Details", "scope": "detail" }
  ]
}
```

| Field           | Type   | Required | Description                                |
| --------------- | ------ | -------- | ------------------------------------------ |
| `schemaVersion` | number | Yes      | Always `1`                                 |
| `id`            | string | Yes      | Unique identifier (kebab-case recommended) |
| `name`          | string | Yes      | Display name shown in UI                   |
| `version`       | string | Yes      | Semver version                             |
| `entry`         | string | Yes      | Relative path to JS entry file             |
| `icon`          | string | Yes      | Relative path to SVG icon file             |
| `links`         | array  | No       | Optional quick links at the bottom of the expanded provider card |
| `lines`         | array  | Yes      | Output shape used for loading skeletons    |
| `windowStarter` | object | No       | Optional Window Starter capability. Absent = no UI and no starter CLI. Malformed values are ignored and do not fail plugin load. |

### Window Starter (`windowStarter`)

```json
"windowStarter": {
  "enabledByDefault": true,
  "defaultRunner": "claude",
  "allowedRunners": ["claude"],
  "windows": [
    { "id": "session", "line": "Session", "weeklyLine": "Weekly" }
  ]
}
```

| Field | Type | Required | Description |
|---|---|---|---|
| `enabledByDefault` | boolean | Yes | Default participation when the user has not stored an override |
| `defaultRunner` | string | Yes | Must be listed in `allowedRunners` |
| `allowedRunners` | string[] | Yes | Host catalog ids only: `claude`, `codex`, `zcode`, `agy`, `opencode`, `hermes`, `pi` |
| `windows` | object[] | Yes | One or more windows; ids must be unique |
| `windows[].id` | string | Yes | Stable window id used in the pin table |
| `windows[].line` | string | Yes | 5-hour progress line label to match |
| `windows[].weeklyLine` | string | Yes | Weekly progress line label to match (exact, not a substring) |
| `windows[].enabledByDefault` | boolean | No | Per-window default; used for independent windows such as Antigravity Session/Claude |

The host owns argv and model pins. Plugins declare whether they participate and which quota lines to watch. Extra JSON keys are ignored.

Validation rules:

- `entry` must be relative (not absolute)
- `entry` must exist within the plugin directory
- `id` must match `globalThis.__openquotacycle_plugin.id`
- `icon` must be relative and point to an SVG file (use `fill="currentColor"` for theme compatibility)
- `links[].url` (if provided) must be an `http://` or `https://` URL

### Links Array (Optional)

| Field   | Type   | Required | Description |
|---------|--------|----------|-------------|
| `label` | string | Yes      | Link text shown in the provider detail quick-actions row |
| `url`   | string | Yes      | External destination opened in the browser (`http/https` only) |

## Output Shape Declaration

Plugins must declare their output shape in `plugin.json`. This enables the UI to render
loading skeletons instantly while probes execute asynchronously.

### Lines Array

| Field     | Type    | Required | Description                                       |
|-----------|---------|----------|---------------------------------------------------|
| `type`    | string  | Yes      | One of: `text`, `progress`                        |
| `label`   | string  | Yes      | Static label shown in the UI for this line        |
| `scope`   | string  | Yes      | `"overview"` or `"detail"` - where line appears   |
| `primary` | boolean | No       | If `true`, this progress line appears in tray icon |

- `"overview"` - shown on both Overview tab and plugin detail pages
- `"detail"` - shown only on plugin detail pages

### Primary Progress (Tray Icon)

Plugins can optionally mark one progress line as `primary: true`. This progress metric will be displayed as a horizontal bar in the system tray icon, allowing users to see usage at a glance without opening the app.

Rules:
- Only `type: "progress"` lines can be primary (the flag is ignored on other types)
- Only the **first** `primary: true` line is used (subsequent ones are ignored)
- Up to 4 enabled plugins with primary progress are shown in the tray (in plugin order)
- If no data is available yet, the bar shows as a track without fill

Example:

```json
{
  "lines": [
    { "type": "progress", "label": "Plan usage", "scope": "overview", "visibleByDefault": true, "primary": true },
    { "type": "progress", "label": "Extra", "scope": "detail" },
    { "type": "text", "label": "Resets", "scope": "detail" }
  ]
}
```

## Entry Point Structure

Plugins must register themselves on the global object. The host injects APIs on
`globalThis.__openquotacycle_ctx` and passes that same object to `probe(ctx)`.

```javascript
globalThis.__openquotacycle_plugin = {
  id: "my-provider",  // Must match manifest.id
  probe: function(ctx) { ... }
}
```

## Output Schema

`probe(ctx)` must return (or resolve to):

```javascript
{ plan?: string, lines: MetricLine[], statuses?: StatusChip[], error?: string }
```

Empty `lines` is a successful probe. Status chips belong in `statuses`, not in `lines`. Thrown strings become `error` on the host output with no lines. Returning `error` together with at least one line is a stale notice: the host keeps the lines and shows the message as the card callout.

Callout copy is two sentences (`Title. Detail.`) so the card can split title from detail. Optional actions are an icon-only refresh button to the right of that copy (tooltip explains the action) so the notice stays the same height as a text-only callout.

### Line Types

```typescript
type MetricLine =
  | { type: "text"; label: string; value: string; color?: string; subtitle?: string }
  | {
      type: "progress";
      label: string;
      used: number;
      limit: number;
      format:
        | { kind: "percent" }
        | { kind: "dollars" }
        | { kind: "count"; suffix: string };
      resetsAt?: string; // ISO timestamp
      periodDurationMs?: number; // period length in ms for pace tracking
      color?: string;
    }

type StatusChip = {
  text: string
  tone: "positive" | "warning" | "danger" | "neutral"
}
```

- `color`: optional hex string (e.g. `#22c55e`)
- `subtitle`: optional text displayed below the line in smaller muted text
- `resetsAt`: optional ISO timestamp (UI shows "Resets in ..." automatically)
- `periodDurationMs`: optional period length in milliseconds (enables pace indicator when combined with `resetsAt`)
- `type: "badge"` is not a metric line. The host rejects it.

### Text Line

Simple label/value pair.

```javascript
ctx.line.text({ label: "Account", value: "user@example.com" })
ctx.line.text({ label: "Status", value: "Active", color: "#22c55e", subtitle: "Since Jan 2024" })
```

### Progress Line

Shows a progress bar with optional formatting.

```javascript
ctx.line.progress({ label: "Usage", used: 42, limit: 100, format: { kind: "percent" } })
// Renders (depending on user settings): "42%" or "58% left"

ctx.line.progress({ label: "Spend", used: 12.34, limit: 100, format: { kind: "dollars" } })
// Renders: "$12.34" or "$87.66 left"

ctx.line.progress({
  label: "Session",
  used: 75,
  limit: 100,
  format: { kind: "percent" },
  resetsAt: ctx.util.toIso("2026-02-01T00:00:00Z"),
})
// UI will show: "Resets in …"
```

### Status chip

Glanceable header state. Not a metric row and not listed in Customize.

```javascript
return {
  lines: [...],
  statuses: [ctx.status.chip({ text: "Peak", tone: "danger" })],
}
```

## Error Handling

| Condition                  | Result                                        |
| -------------------------- | --------------------------------------------- |
| Plugin throws a string     | `error` with that string                      |
| Plugin throws non-string   | `error` with a generic fallback message       |
| Promise rejects            | `error`                                       |
| Promise never resolves     | `error` (timeout)                             |
| Invalid line type          | `error`                                       |
| Missing `lines` array      | empty `lines` (success)                       |
| Invalid progress values    | `error` (line-specific validation error)      |

Prefer throwing short, actionable strings (not `Error` objects).

## Minimal Example

A complete, working plugin that fetches data and displays progress, text, and a status chip.

**`plugin.json`:**

```json
{
  "schemaVersion": 1,
  "id": "minimal",
  "name": "Minimal Example",
  "version": "0.0.1",
  "entry": "plugin.js",
  "icon": "icon.svg",
  "lines": [
    { "type": "progress", "label": "Usage", "scope": "overview", "visibleByDefault": true, "primary": true },
    { "type": "text", "label": "Fetched at", "scope": "detail" }
  ]
}
```

**`plugin.js`:**

```javascript
(function () {
  globalThis.__openquotacycle_plugin = {
    id: "minimal",
    probe: function (ctx) {
      let resp
      try {
        resp = ctx.host.http.request({
          method: "GET",
          url: "https://httpbin.org/json",
          timeoutMs: 5000,
        })
      } catch (e) {
        throw "Request failed. Check your connection."
      }

      if (resp.status !== 200) {
        throw "Request failed (HTTP " + resp.status + "). Try again later."
      }

      let data
      try {
        data = JSON.parse(resp.bodyText)
      } catch {
        throw "Invalid JSON. Try again later."
      }

      return {
        lines: [
          ctx.line.progress({
            label: "Usage",
            used: 42,
            limit: 100,
            format: { kind: "percent" },
            resetsAt: ctx.util.toIso("2026-02-01T00:00:00Z"),
          }),
          ctx.line.text({ label: "Fetched at", value: ctx.nowIso }),
        ],
        statuses: [ctx.status.chip({ text: "Connected", tone: "positive" })],
      }
    },
  }
})()
```

## Best Practices

- Wrap all host API calls in try/catch
- Throw short, user-friendly strings (not raw exception objects)
- Use `ctx.app.pluginDataDir` for plugin-specific state/config
- Keep probes fast (users wait on refresh)
- Validate API responses before accessing nested fields

## See Also

- [Host API Reference](./api.md) - Full documentation of `ctx.host.*` APIs
