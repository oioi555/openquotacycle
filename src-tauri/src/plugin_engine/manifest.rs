use base64::{Engine, engine::general_purpose::STANDARD};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ManifestLine {
    #[serde(rename = "type")]
    pub line_type: String,
    pub label: String,
    pub scope: String,
    /// Shown by default; unmarked progress lines default to On Demand.
    #[serde(default)]
    pub visible_by_default: bool,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginLink {
    pub label: String,
    pub url: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WindowStarterWindow {
    pub id: String,
    pub line: String,
    pub weekly_line: String,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub enabled_by_default: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct WindowStarterCapability {
    pub enabled_by_default: bool,
    pub default_runner: String,
    pub allowed_runners: Vec<String>,
    pub windows: Vec<WindowStarterWindow>,
}

#[derive(Debug, Clone, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginManifest {
    pub schema_version: u32,
    pub id: String,
    pub name: String,
    pub version: String,
    pub entry: String,
    pub icon: String,
    pub brand_color: Option<String>,
    pub lines: Vec<ManifestLine>,
    #[serde(default)]
    pub links: Vec<PluginLink>,
    /// Raw JSON so a malformed value never fails plugin load.
    #[serde(default, rename = "windowStarter")]
    pub(crate) window_starter_raw: Option<serde_json::Value>,
}

#[derive(Debug, Clone)]
pub struct LoadedPlugin {
    pub manifest: PluginManifest,
    pub plugin_dir: PathBuf,
    pub entry_script: String,
    pub icon_data_url: String,
    pub window_starter: Option<WindowStarterCapability>,
}

pub fn load_plugins_from_dir(plugins_dir: &std::path::Path) -> Vec<LoadedPlugin> {
    let mut plugins = Vec::new();
    let entries = match std::fs::read_dir(plugins_dir) {
        Ok(e) => e,
        Err(_) => return plugins,
    };

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.is_dir() {
            continue;
        }
        let manifest_path = path.join("plugin.json");
        if !manifest_path.exists() {
            continue;
        }
        if let Ok(p) = load_single_plugin(&path) {
            plugins.push(p);
        }
    }

    plugins.sort_by(|a, b| a.manifest.id.cmp(&b.manifest.id));
    plugins
}

fn load_single_plugin(
    plugin_dir: &std::path::Path,
) -> Result<LoadedPlugin, Box<dyn std::error::Error>> {
    let manifest_path = plugin_dir.join("plugin.json");
    let manifest_text = std::fs::read_to_string(&manifest_path)?;
    let mut manifest: PluginManifest = serde_json::from_str(&manifest_text)?;
    manifest.links = sanitize_plugin_links(&manifest.id, std::mem::take(&mut manifest.links));
    let window_starter = sanitize_window_starter(&manifest.id, manifest.window_starter_raw.take());

    // `visibleByDefault` only affects progress and text lines; flag it elsewhere.
    for line in manifest.lines.iter() {
        if line.visible_by_default && line.line_type != "progress" && line.line_type != "text" {
            log::warn!(
                "plugin {} line '{}' sets visibleByDefault but type is '{}'; only progress and text lines use it",
                manifest.id,
                line.label,
                line.line_type
            );
        }
    }

    if manifest.entry.trim().is_empty() {
        return Err("plugin entry field cannot be empty".into());
    }
    if Path::new(&manifest.entry).is_absolute() {
        return Err("plugin entry must be a relative path".into());
    }

    let entry_path = plugin_dir.join(&manifest.entry);
    let canonical_plugin_dir = plugin_dir.canonicalize()?;
    let canonical_entry_path = entry_path.canonicalize()?;
    if !canonical_entry_path.starts_with(&canonical_plugin_dir) {
        return Err("plugin entry must remain within plugin directory".into());
    }
    if !canonical_entry_path.is_file() {
        return Err("plugin entry must be a file".into());
    }

    let entry_script = std::fs::read_to_string(&canonical_entry_path)?;

    let icon_file = plugin_dir.join(&manifest.icon);
    let icon_bytes = std::fs::read(&icon_file)?;
    let icon_bytes = match &manifest.brand_color {
        Some(color) => {
            let svg = String::from_utf8_lossy(&icon_bytes);
            svg.replace("currentColor", color).into_bytes()
        }
        None => icon_bytes,
    };
    let icon_data_url = format!("data:image/svg+xml;base64,{}", STANDARD.encode(&icon_bytes));

    Ok(LoadedPlugin {
        manifest,
        plugin_dir: plugin_dir.to_path_buf(),
        entry_script,
        icon_data_url,
        window_starter,
    })
}

/// Malformed `windowStarter` values become `None` and never fail plugin load.
pub fn sanitize_window_starter(
    plugin_id: &str,
    raw: Option<serde_json::Value>,
) -> Option<WindowStarterCapability> {
    let Some(value) = raw else {
        return None;
    };
    let Some(object) = value.as_object() else {
        log::warn!(
            "plugin {} has malformed windowStarter (not an object); ignoring",
            plugin_id
        );
        return None;
    };

    let enabled_by_default = match object.get("enabledByDefault") {
        Some(serde_json::Value::Bool(value)) => *value,
        _ => {
            log::warn!(
                "plugin {} windowStarter.enabledByDefault is missing or not a bool; ignoring",
                plugin_id
            );
            return None;
        }
    };

    let default_runner = match object.get("defaultRunner").and_then(|value| value.as_str()) {
        Some(runner) if !runner.trim().is_empty() => runner.trim().to_string(),
        _ => {
            log::warn!(
                "plugin {} windowStarter.defaultRunner is missing or empty; ignoring",
                plugin_id
            );
            return None;
        }
    };

    let allowed_runners = match object.get("allowedRunners") {
        Some(serde_json::Value::Array(entries)) => {
            let mut runners = Vec::new();
            for entry in entries {
                let Some(runner) = entry.as_str().map(str::trim) else {
                    log::warn!(
                        "plugin {} windowStarter.allowedRunners has a non-string entry; ignoring",
                        plugin_id
                    );
                    return None;
                };
                if runner.is_empty() {
                    log::warn!(
                        "plugin {} windowStarter.allowedRunners has an empty entry; ignoring",
                        plugin_id
                    );
                    return None;
                }
                if !runners.iter().any(|existing| existing == runner) {
                    runners.push(runner.to_string());
                }
            }
            runners
        }
        _ => {
            log::warn!(
                "plugin {} windowStarter.allowedRunners is missing or not an array; ignoring",
                plugin_id
            );
            return None;
        }
    };
    if allowed_runners.is_empty() {
        log::warn!(
            "plugin {} windowStarter.allowedRunners is empty; ignoring",
            plugin_id
        );
        return None;
    }
    if !allowed_runners
        .iter()
        .any(|runner| runner == &default_runner)
    {
        log::warn!(
            "plugin {} windowStarter.defaultRunner '{}' is not in allowedRunners; ignoring",
            plugin_id,
            default_runner
        );
        return None;
    }

    let windows = match object.get("windows") {
        Some(serde_json::Value::Array(entries)) => {
            let mut windows = Vec::new();
            let mut seen_ids = std::collections::HashSet::new();
            for entry in entries {
                let Some(window) = sanitize_window_starter_window(plugin_id, entry) else {
                    return None;
                };
                if !seen_ids.insert(window.id.clone()) {
                    log::warn!(
                        "plugin {} windowStarter.windows has duplicate id '{}'; ignoring",
                        plugin_id,
                        window.id
                    );
                    return None;
                }
                windows.push(window);
            }
            windows
        }
        _ => {
            log::warn!(
                "plugin {} windowStarter.windows is missing or not an array; ignoring",
                plugin_id
            );
            return None;
        }
    };
    if windows.is_empty() {
        log::warn!(
            "plugin {} windowStarter.windows is empty; ignoring",
            plugin_id
        );
        return None;
    }

    Some(WindowStarterCapability {
        enabled_by_default,
        default_runner,
        allowed_runners,
        windows,
    })
}

fn sanitize_window_starter_window(
    plugin_id: &str,
    value: &serde_json::Value,
) -> Option<WindowStarterWindow> {
    let Some(object) = value.as_object() else {
        log::warn!(
            "plugin {} windowStarter.windows entry is not an object; ignoring",
            plugin_id
        );
        return None;
    };

    let id = match object.get("id").and_then(|value| value.as_str()) {
        Some(id) if !id.trim().is_empty() => id.trim().to_string(),
        _ => {
            log::warn!(
                "plugin {} windowStarter window id is missing or empty; ignoring",
                plugin_id
            );
            return None;
        }
    };
    let line = match object.get("line").and_then(|value| value.as_str()) {
        Some(line) if !line.trim().is_empty() => line.trim().to_string(),
        _ => {
            log::warn!(
                "plugin {} windowStarter window '{}' line is missing or empty; ignoring",
                plugin_id,
                id
            );
            return None;
        }
    };
    let weekly_line = match object.get("weeklyLine").and_then(|value| value.as_str()) {
        Some(weekly) if !weekly.trim().is_empty() => weekly.trim().to_string(),
        _ => {
            log::warn!(
                "plugin {} windowStarter window '{}' weeklyLine is missing or empty; ignoring",
                plugin_id,
                id
            );
            return None;
        }
    };
    let enabled_by_default = match object.get("enabledByDefault") {
        None => None,
        Some(serde_json::Value::Bool(value)) => Some(*value),
        Some(_) => {
            log::warn!(
                "plugin {} windowStarter window '{}' enabledByDefault is not a bool; ignoring",
                plugin_id,
                id
            );
            return None;
        }
    };

    Some(WindowStarterWindow {
        id,
        line,
        weekly_line,
        enabled_by_default,
    })
}

fn sanitize_plugin_links(plugin_id: &str, links: Vec<PluginLink>) -> Vec<PluginLink> {
    links
        .into_iter()
        .filter_map(|link| {
            let label = link.label.trim().to_string();
            let url = link.url.trim().to_string();

            if label.is_empty() || url.is_empty() {
                log::warn!(
                    "plugin {} has link with empty label/url; skipping",
                    plugin_id
                );
                return None;
            }
            if !(url.starts_with("https://") || url.starts_with("http://")) {
                log::warn!(
                    "plugin {} link '{}' has non-http(s) url '{}'; skipping",
                    plugin_id,
                    label,
                    url
                );
                return None;
            }

            Some(PluginLink { label, url })
        })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse_manifest(json: &str) -> PluginManifest {
        serde_json::from_str::<PluginManifest>(json).expect("manifest parse failed")
    }

    #[test]
    fn default_visible_is_none_by_default() {
        let manifest = parse_manifest(
            r#"
            {
              "schemaVersion": 1,
              "id": "x",
              "name": "X",
              "version": "0.0.1",
              "entry": "plugin.js",
              "icon": "icon.svg",
              "brandColor": null,
              "lines": [
                { "type": "progress", "label": "A", "scope": "overview" }
              ]
            }
            "#,
        );
        assert_eq!(manifest.lines.len(), 1);
        assert!(!manifest.lines[0].visible_by_default);
        assert!(manifest.links.is_empty());
    }

    #[test]
    fn visible_by_default_parsed_correctly() {
        let manifest = parse_manifest(
            r#"
            {
              "schemaVersion": 1,
              "id": "x",
              "name": "X",
              "version": "0.0.1",
              "entry": "plugin.js",
              "icon": "icon.svg",
              "brandColor": null,
              "lines": [
                { "type": "progress", "label": "A", "scope": "overview", "visibleByDefault": true },
                { "type": "progress", "label": "B", "scope": "overview" },
                { "type": "text", "label": "C", "scope": "overview" }
              ]
            }
            "#,
        );

        assert!(manifest.lines[0].visible_by_default);
        assert!(!manifest.lines[1].visible_by_default);
        assert!(!manifest.lines[2].visible_by_default);
    }

    #[test]
    fn links_are_parsed_when_present() {
        let manifest = parse_manifest(
            r#"
            {
              "schemaVersion": 1,
              "id": "x",
              "name": "X",
              "version": "0.0.1",
              "entry": "plugin.js",
              "icon": "icon.svg",
              "brandColor": null,
              "links": [
                { "label": "Status", "url": "https://status.example.com" },
                { "label": "Billing", "url": "https://example.com/billing" }
              ],
              "lines": [
                { "type": "progress", "label": "A", "scope": "overview" }
              ]
            }
            "#,
        );

        assert_eq!(manifest.links.len(), 2);
        assert_eq!(manifest.links[0].label, "Status");
        assert_eq!(manifest.links[1].url, "https://example.com/billing");
    }

    #[test]
    fn sanitize_plugin_links_filters_invalid_entries() {
        let links = vec![
            PluginLink {
                label: " Status ".to_string(),
                url: " https://status.example.com ".to_string(),
            },
            PluginLink {
                label: " ".to_string(),
                url: "https://example.com".to_string(),
            },
            PluginLink {
                label: "Docs".to_string(),
                url: "ftp://example.com".to_string(),
            },
        ];

        let sanitized = sanitize_plugin_links("x", links);
        assert_eq!(sanitized.len(), 1);
        assert_eq!(sanitized[0].label, "Status");
        assert_eq!(sanitized[0].url, "https://status.example.com");
    }

    fn parse_window_starter(json: &str) -> Option<WindowStarterCapability> {
        let manifest = parse_manifest(json);
        sanitize_window_starter(&manifest.id, manifest.window_starter_raw)
    }

    fn base_manifest_with_window_starter(window_starter: &str) -> String {
        format!(
            r#"
            {{
              "schemaVersion": 1,
              "id": "x",
              "name": "X",
              "version": "0.0.1",
              "entry": "plugin.js",
              "icon": "icon.svg",
              "brandColor": null,
              "lines": [
                {{ "type": "progress", "label": "A", "scope": "overview" }}
              ],
              "windowStarter": {window_starter}
            }}
            "#
        )
    }

    #[test]
    fn window_starter_missing_is_none() {
        let manifest = parse_manifest(
            r#"
            {
              "schemaVersion": 1,
              "id": "x",
              "name": "X",
              "version": "0.0.1",
              "entry": "plugin.js",
              "icon": "icon.svg",
              "brandColor": null,
              "lines": [
                { "type": "progress", "label": "A", "scope": "overview" }
              ]
            }
            "#,
        );
        assert!(manifest.window_starter_raw.is_none());
        assert!(sanitize_window_starter(&manifest.id, manifest.window_starter_raw).is_none());
    }

    #[test]
    fn window_starter_object_is_parsed() {
        let capability = parse_window_starter(&base_manifest_with_window_starter(
            r#"{
              "enabledByDefault": true,
              "defaultRunner": "claude",
              "allowedRunners": ["claude"],
              "windows": [
                { "id": "session", "line": "Session", "weeklyLine": "Weekly" }
              ]
            }"#,
        ));
        let capability = capability.expect("valid windowStarter");
        assert!(capability.enabled_by_default);
        assert_eq!(capability.default_runner, "claude");
        assert_eq!(capability.allowed_runners, vec!["claude"]);
        assert_eq!(capability.windows.len(), 1);
        assert_eq!(capability.windows[0].id, "session");
        assert_eq!(capability.windows[0].line, "Session");
        assert_eq!(capability.windows[0].weekly_line, "Weekly");
        assert_eq!(capability.windows[0].enabled_by_default, None);
    }

    #[test]
    fn window_starter_non_object_is_ignored() {
        let manifest = parse_manifest(&base_manifest_with_window_starter(r#""nope""#));
        assert!(manifest.window_starter_raw.is_some());
        assert!(sanitize_window_starter(&manifest.id, manifest.window_starter_raw).is_none());
    }

    #[test]
    fn window_starter_malformed_object_is_ignored() {
        assert!(
            parse_window_starter(&base_manifest_with_window_starter(
                r#"{ "enabledByDefault": true }"#
            ))
            .is_none()
        );
    }

    #[test]
    fn window_starter_window_enabled_by_default_is_optional() {
        let capability = parse_window_starter(&base_manifest_with_window_starter(
            r#"{
              "enabledByDefault": false,
              "defaultRunner": "agy",
              "allowedRunners": ["agy"],
              "windows": [
                { "id": "session", "line": "Session", "weeklyLine": "Weekly", "enabledByDefault": false },
                { "id": "claude", "line": "Claude", "weeklyLine": "Claude Wk", "enabledByDefault": false }
              ]
            }"#,
        ))
        .expect("valid dual-window capability");
        assert!(!capability.enabled_by_default);
        assert_eq!(capability.windows[0].enabled_by_default, Some(false));
        assert_eq!(capability.windows[1].id, "claude");
        assert_eq!(capability.windows[1].weekly_line, "Claude Wk");
    }

    #[test]
    fn extra_manifest_fields_do_not_fail_parse() {
        let manifest = parse_manifest(
            r#"
            {
              "schemaVersion": 1,
              "id": "x",
              "name": "X",
              "version": "0.0.1",
              "entry": "plugin.js",
              "icon": "icon.svg",
              "brandColor": null,
              "unknownField": { "ignored": true },
              "lines": [
                { "type": "progress", "label": "A", "scope": "overview" }
              ]
            }
            "#,
        );
        assert_eq!(manifest.id, "x");
    }
}
