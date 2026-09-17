use crate::plugin_engine::host_api;
use crate::plugin_engine::manifest::LoadedPlugin;
use rquickjs::{Array, Context, Ctx, Error, Object, Promise, Runtime, Value};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ProgressFormat {
    Percent,
    Dollars,
    Count { suffix: String },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type", rename_all = "camelCase")]
pub enum MetricLine {
    Text {
        label: String,
        value: String,
        color: Option<String>,
        subtitle: Option<String>,
    },
    Progress {
        label: String,
        used: f64,
        limit: f64,
        format: ProgressFormat,
        #[serde(rename = "resetsAt")]
        resets_at: Option<String>,
        #[serde(rename = "periodDurationMs")]
        period_duration_ms: Option<u64>,
        color: Option<String>,
    },
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub enum StatusTone {
    Positive,
    Warning,
    Danger,
    Neutral,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StatusChip {
    pub text: String,
    pub tone: StatusTone,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PluginOutput {
    pub provider_id: String,
    pub display_name: String,
    pub plan: Option<String>,
    pub lines: Vec<MetricLine>,
    #[serde(default)]
    pub statuses: Vec<StatusChip>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    pub icon_url: String,
}

pub fn run_probe(plugin: &LoadedPlugin, app_data_dir: &PathBuf, app_version: &str) -> PluginOutput {
    let fallback = error_output(plugin, "runtime error".to_string());

    let rt = match Runtime::new() {
        Ok(rt) => rt,
        Err(_) => return fallback,
    };

    let ctx = match Context::full(&rt) {
        Ok(ctx) => ctx,
        Err(_) => return fallback,
    };

    let plugin_id = plugin.manifest.id.clone();
    let display_name = plugin.manifest.name.clone();
    let entry_script = plugin.entry_script.clone();
    let icon_url = plugin.icon_data_url.clone();
    let app_data = app_data_dir.clone();

    ctx.with(|ctx| {
        if host_api::inject_host_api(&ctx, &plugin_id, &app_data, app_version).is_err() {
            return error_output(plugin, "host api injection failed".to_string());
        }
        if host_api::patch_http_wrapper(&ctx).is_err() {
            return error_output(plugin, "http wrapper patch failed".to_string());
        }
        if host_api::patch_ls_wrapper(&ctx).is_err() {
            return error_output(plugin, "ls wrapper patch failed".to_string());
        }
        if host_api::inject_utils(&ctx).is_err() {
            return error_output(plugin, "utils injection failed".to_string());
        }

        if ctx.eval::<(), _>(entry_script.as_bytes()).is_err() {
            return error_output(plugin, "script eval failed".to_string());
        }

        let globals = ctx.globals();
        let plugin_obj: Object = match globals.get("__openquotacycle_plugin") {
            Ok(obj) => obj,
            Err(_) => return error_output(plugin, "missing __openquotacycle_plugin".to_string()),
        };

        let probe_fn: rquickjs::Function = match plugin_obj.get("probe") {
            Ok(f) => f,
            Err(_) => return error_output(plugin, "missing probe()".to_string()),
        };

        let probe_ctx: Value = globals
            .get("__openquotacycle_ctx")
            .unwrap_or_else(|_| Value::new_undefined(ctx.clone()));

        let result_value: Value = match probe_fn.call((probe_ctx,)) {
            Ok(r) => r,
            Err(_) => return error_output(plugin, extract_error_string(&ctx)),
        };
        let result: Object = if result_value.is_promise() {
            let promise: Promise = match result_value.into_promise() {
                Some(promise) => promise,
                None => {
                    return error_output(plugin, "probe() returned invalid promise".to_string());
                }
            };
            match promise.finish::<Object>() {
                Ok(obj) => obj,
                Err(Error::WouldBlock) => {
                    return error_output(plugin, "probe() returned unresolved promise".to_string());
                }
                Err(_) => return error_output(plugin, extract_error_string(&ctx)),
            }
        } else {
            match result_value.into_object() {
                Some(obj) => obj,
                None => return error_output(plugin, "probe() returned non-object".to_string()),
            }
        };

        let plan: Option<String> = result
            .get::<_, String>("plan")
            .ok()
            .filter(|s| !s.is_empty());

        let lines = match parse_lines(&result) {
            Ok(lines) => lines,
            Err(msg) => return error_output(plugin, msg),
        };
        let statuses = match parse_statuses(&result) {
            Ok(statuses) => statuses,
            Err(msg) => return error_output(plugin, msg),
        };

        let notice = result
            .get::<_, String>("error")
            .ok()
            .map(|value| value.trim().to_string())
            .filter(|value| !value.is_empty());

        if let Some(message) = notice {
            if lines.is_empty() {
                return error_output(plugin, message);
            }
            return PluginOutput {
                provider_id: plugin_id,
                display_name,
                plan,
                lines,
                statuses,
                error: Some(message),
                icon_url,
            };
        }

        PluginOutput {
            provider_id: plugin_id,
            display_name,
            plan,
            lines,
            statuses,
            error: None,
            icon_url,
        }
    })
}

fn parse_statuses(result: &Object) -> Result<Vec<StatusChip>, String> {
    let statuses: Array = match result.get("statuses") {
        Ok(arr) => arr,
        Err(_) => return Ok(Vec::new()),
    };

    let mut out = Vec::new();
    let len = statuses.len();
    for idx in 0..len {
        let chip: Object = statuses
            .get(idx)
            .map_err(|_| format!("invalid status at index {}", idx))?;
        let text = chip
            .get::<_, String>("text")
            .unwrap_or_default()
            .trim()
            .to_string();
        if text.is_empty() {
            return Err(format!("status at index {} missing text", idx));
        }
        let tone_raw = chip
            .get::<_, String>("tone")
            .unwrap_or_default()
            .trim()
            .to_ascii_lowercase();
        let tone = match tone_raw.as_str() {
            "positive" => StatusTone::Positive,
            "warning" => StatusTone::Warning,
            "danger" => StatusTone::Danger,
            "neutral" => StatusTone::Neutral,
            _ => {
                return Err(format!(
                    "status at index {} invalid tone: {}",
                    idx, tone_raw
                ));
            }
        };
        out.push(StatusChip { text, tone });
    }
    Ok(out)
}

fn parse_lines(result: &Object) -> Result<Vec<MetricLine>, String> {
    let lines: Array = match result.get("lines") {
        Ok(arr) => arr,
        Err(_) => return Ok(Vec::new()),
    };

    let mut out = Vec::new();
    let len = lines.len();
    for idx in 0..len {
        let line: Object = lines
            .get(idx)
            .map_err(|_| format!("invalid line at index {}", idx))?;

        let line_type: String = line.get("type").unwrap_or_default();
        let label = line.get::<_, String>("label").unwrap_or_default();
        let color = line.get::<_, String>("color").ok();
        let subtitle = line.get::<_, String>("subtitle").ok();

        match line_type.as_str() {
            "text" => {
                let value = line.get::<_, String>("value").unwrap_or_default();
                out.push(MetricLine::Text {
                    label,
                    value,
                    color,
                    subtitle,
                });
            }
            "progress" => {
                let used_value: Value = match line.get("used") {
                    Ok(v) => v,
                    Err(_) => {
                        return Err(format!("progress line at index {} missing used", idx));
                    }
                };
                let used = match used_value.as_number() {
                    Some(n) => n,
                    None => {
                        return Err(format!(
                            "progress line at index {} invalid used (expected number)",
                            idx
                        ));
                    }
                };

                let limit_value: Value = match line.get("limit") {
                    Ok(v) => v,
                    Err(_) => {
                        return Err(format!("progress line at index {} missing limit", idx));
                    }
                };
                let limit = match limit_value.as_number() {
                    Some(n) => n,
                    None => {
                        return Err(format!(
                            "progress line at index {} invalid limit (expected number)",
                            idx
                        ));
                    }
                };

                if !used.is_finite() || used < 0.0 {
                    return Err(format!(
                        "progress line at index {} invalid used: {}",
                        idx, used
                    ));
                }
                if !limit.is_finite() || limit <= 0.0 {
                    return Err(format!(
                        "progress line at index {} invalid limit: {}",
                        idx, limit
                    ));
                }

                let format_obj: Object = match line.get("format") {
                    Ok(obj) => obj,
                    Err(_) => {
                        return Err(format!("progress line at index {} missing format", idx));
                    }
                };
                let kind_value: Value = match format_obj.get("kind") {
                    Ok(v) => v,
                    Err(_) => {
                        return Err(format!(
                            "progress line at index {} missing format.kind",
                            idx
                        ));
                    }
                };
                let kind = match kind_value.as_string() {
                    Some(s) => s.to_string().unwrap_or_default(),
                    None => {
                        return Err(format!(
                            "progress line at index {} invalid format.kind (expected string)",
                            idx
                        ));
                    }
                };
                let format = match kind.as_str() {
                    "percent" => {
                        if limit != 100.0 {
                            return Err(format!(
                                "progress line at index {}: percent format requires limit=100 (got {})",
                                idx, limit
                            ));
                        }
                        ProgressFormat::Percent
                    }
                    "dollars" => ProgressFormat::Dollars,
                    "count" => {
                        let suffix_value: Value = match format_obj.get("suffix") {
                            Ok(v) => v,
                            Err(_) => {
                                return Err(format!(
                                    "progress line at index {}: count format missing suffix",
                                    idx
                                ));
                            }
                        };
                        let suffix = match suffix_value.as_string() {
                            Some(s) => s.to_string().unwrap_or_default(),
                            None => {
                                return Err(format!(
                                    "progress line at index {}: count format suffix must be a string",
                                    idx
                                ));
                            }
                        };
                        let suffix = suffix.trim().to_string();
                        if suffix.is_empty() {
                            return Err(format!(
                                "progress line at index {}: count format suffix must be non-empty",
                                idx
                            ));
                        }
                        ProgressFormat::Count { suffix }
                    }
                    _ => {
                        return Err(format!(
                            "progress line at index {} invalid format.kind: {}",
                            idx, kind
                        ));
                    }
                };

                let resets_at = match line.get::<_, Value>("resetsAt") {
                    Ok(v) => {
                        if v.is_null() || v.is_undefined() {
                            None
                        } else if let Some(s) = v.as_string() {
                            let raw = s.to_string().unwrap_or_default();
                            let value = raw.trim().to_string();
                            if value.is_empty() {
                                None
                            } else {
                                let parsed = time::OffsetDateTime::parse(
                                    &value,
                                    &time::format_description::well_known::Rfc3339,
                                );
                                if parsed.is_ok() {
                                    Some(value)
                                } else {
                                    // ISO-like but missing timezone: assume UTC.
                                    let is_missing_tz =
                                        value.contains('T') && !value.ends_with('Z') && {
                                            let tail = value.splitn(2, 'T').nth(1).unwrap_or("");
                                            !tail.contains('+') && !tail.contains('-')
                                        };
                                    if is_missing_tz {
                                        let with_z = format!("{}Z", value);
                                        let parsed_with_z = time::OffsetDateTime::parse(
                                            &with_z,
                                            &time::format_description::well_known::Rfc3339,
                                        );
                                        if parsed_with_z.is_ok() {
                                            Some(with_z)
                                        } else {
                                            log::warn!(
                                                "invalid resetsAt at index {} (value='{}'), omitting",
                                                idx,
                                                raw
                                            );
                                            None
                                        }
                                    } else {
                                        log::warn!(
                                            "invalid resetsAt at index {} (value='{}'), omitting",
                                            idx,
                                            raw
                                        );
                                        None
                                    }
                                }
                            }
                        } else {
                            log::warn!("invalid resetsAt at index {} (non-string), omitting", idx);
                            None
                        }
                    }
                    Err(_) => None,
                };

                // Parse optional periodDurationMs
                let period_duration_ms: Option<u64> = match line.get::<_, Value>("periodDurationMs")
                {
                    Ok(val) => {
                        if val.is_null() || val.is_undefined() {
                            None
                        } else if let Some(n) = val.as_number() {
                            let ms = n as u64;
                            if ms > 0 {
                                Some(ms)
                            } else {
                                log::warn!(
                                    "periodDurationMs at index {} must be positive, omitting",
                                    idx
                                );
                                None
                            }
                        } else {
                            log::warn!(
                                "invalid periodDurationMs at index {} (non-number), omitting",
                                idx
                            );
                            None
                        }
                    }
                    Err(_) => None,
                };

                out.push(MetricLine::Progress {
                    label,
                    used,
                    limit,
                    format,
                    resets_at,
                    period_duration_ms,
                    color,
                });
            }
            "badge" => {
                return Err(format!("unknown line type at index {}: badge", idx));
            }
            _ => {
                return Err(format!("unknown line type at index {}: {}", idx, line_type));
            }
        }
    }

    Ok(out)
}

fn error_output(plugin: &LoadedPlugin, message: String) -> PluginOutput {
    PluginOutput {
        provider_id: plugin.manifest.id.clone(),
        display_name: plugin.manifest.name.clone(),
        plan: None,
        lines: vec![],
        statuses: vec![],
        error: Some(message),
        icon_url: plugin.icon_data_url.clone(),
    }
}

fn extract_error_string(ctx: &Ctx<'_>) -> String {
    let exc = ctx.catch();
    if exc.is_null() || exc.is_undefined() {
        return "The plugin failed, try again or contact plugin author.".to_string();
    }
    if let Some(str_val) = exc.as_string() {
        let message: String = str_val.to_string().unwrap_or_default();
        let trimmed = message.trim();
        if !trimmed.is_empty() {
            return trimmed.to_string();
        }
    }
    "The plugin failed, try again or contact plugin author.".to_string()
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::plugin_engine::manifest::{LoadedPlugin, PluginManifest};
    use serde_json::Value as JsonValue;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_plugin(entry_script: &str) -> LoadedPlugin {
        LoadedPlugin {
            manifest: PluginManifest {
                schema_version: 1,
                id: "test".to_string(),
                name: "Test".to_string(),
                version: "0.0.0".to_string(),
                entry: "plugin.js".to_string(),
                icon: "icon.svg".to_string(),
                brand_color: None,
                lines: vec![],
                links: vec![],
                window_starter_raw: None,
            },
            window_starter: None,
            plugin_dir: PathBuf::from("."),
            entry_script: entry_script.to_string(),
            icon_data_url: "data:image/svg+xml;base64,".to_string(),
        }
    }

    fn temp_app_dir(label: &str) -> PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_nanos();
        std::env::temp_dir().join(format!("openquotacycle-test-{}-{}", label, nanos))
    }

    fn error_text(output: PluginOutput) -> String {
        output
            .error
            .clone()
            .unwrap_or_else(|| panic!("expected error, got {:?}", output))
    }

    #[test]
    fn run_probe_returns_thrown_string_from_sync_error() {
        let plugin = test_plugin(
            r#"
            globalThis.__openquotacycle_plugin = {
                probe() {
                    throw "boom";
                }
            };
            "#,
        );
        let output = run_probe(&plugin, &temp_app_dir("sync"), "0.0.0");
        assert_eq!(error_text(output), "boom");
    }

    #[test]
    fn run_probe_reports_missing_openquotacycle_plugin_when_only_legacy_global_is_set() {
        let plugin = test_plugin(
            r#"
            globalThis.__quotracker_plugin = {
                probe() {
                    return { plan: "Pro", lines: [] };
                }
            };
            "#,
        );
        let output = run_probe(&plugin, &temp_app_dir("legacy-global"), "0.0.0");
        assert_eq!(error_text(output), "missing __openquotacycle_plugin");
    }

    #[test]
    fn run_probe_returns_thrown_string_from_async_error() {
        let plugin = test_plugin(
            r#"
            globalThis.__openquotacycle_plugin = {
                probe: async function () {
                    throw "boom";
                }
            };
            "#,
        );
        let output = run_probe(&plugin, &temp_app_dir("async"), "0.0.0");
        assert_eq!(error_text(output), "boom");
    }

    #[test]
    fn progress_resets_at_serializes_as_resets_at_camelcase() {
        let line = MetricLine::Progress {
            label: "Session".to_string(),
            used: 1.0,
            limit: 100.0,
            format: ProgressFormat::Percent,
            resets_at: Some("2099-01-01T00:00:00.000Z".to_string()),
            period_duration_ms: None,
            color: None,
        };

        let json: JsonValue = serde_json::to_value(&line).expect("serialize");
        let obj = json.as_object().expect("object");
        assert!(obj.get("resetsAt").is_some(), "expected resetsAt key");
        assert!(
            obj.get("resets_at").is_none(),
            "did not expect resets_at key"
        );
    }

    #[test]
    fn run_probe_accepts_empty_lines() {
        let plugin = test_plugin(
            r#"
            globalThis.__openquotacycle_plugin = {
                probe() {
                    return { plan: "Pro", lines: [] };
                }
            };
            "#,
        );
        let output = run_probe(&plugin, &temp_app_dir("empty"), "0.0.0");
        assert!(output.error.is_none());
        assert!(output.lines.is_empty());
        assert!(output.statuses.is_empty());
        assert_eq!(output.plan.as_deref(), Some("Pro"));
    }

    #[test]
    fn run_probe_parses_status_chips() {
        let plugin = test_plugin(
            r#"
            globalThis.__openquotacycle_plugin = {
                probe() {
                    return {
                        plan: "Pro",
                        lines: [{ type: "text", label: "Extra Usage", value: "5 cap" }],
                        statuses: [{ text: "Peak", tone: "danger" }],
                    };
                }
            };
            "#,
        );
        let output = run_probe(&plugin, &temp_app_dir("status"), "0.0.0");
        assert!(output.error.is_none());
        assert_eq!(output.statuses.len(), 1);
        assert_eq!(output.statuses[0].text, "Peak");
        assert_eq!(output.statuses[0].tone, StatusTone::Danger);
    }

    #[test]
    fn run_probe_status_chip_helper_matches_raw_statuses() {
        let plugin = test_plugin(
            r#"
            globalThis.__openquotacycle_plugin = {
                probe(ctx) {
                    return {
                        plan: "Pro",
                        lines: [],
                        statuses: [ctx.status.chip({ text: "Peak", tone: "danger" })],
                    };
                }
            };
            "#,
        );
        let output = run_probe(&plugin, &temp_app_dir("status-helper"), "0.0.0");
        assert!(output.error.is_none());
        assert_eq!(output.statuses.len(), 1);
        assert_eq!(output.statuses[0].text, "Peak");
        assert_eq!(output.statuses[0].tone, StatusTone::Danger);
    }

    #[test]
    fn run_probe_rejects_badge_lines() {
        let plugin = test_plugin(
            r#"
            globalThis.__openquotacycle_plugin = {
                probe() {
                    return {
                        lines: [{ type: "badge", label: "Status", text: "Nope" }],
                    };
                }
            };
            "#,
        );
        let output = run_probe(&plugin, &temp_app_dir("badge"), "0.0.0");
        assert!(error_text(output).contains("badge"));
    }

    #[test]
    fn run_probe_keeps_lines_when_result_includes_error() {
        let plugin = test_plugin(
            r#"
            globalThis.__openquotacycle_plugin = {
                probe() {
                    return {
                        plan: "SuperGrok",
                        lines: [{ type: "text", label: "Weekly", value: "100%" }],
                        statuses: [{ text: "Stale", tone: "warning" }],
                        error: "Grok session expired. Reconnect Grok in GrokBuild to refresh it.",
                    };
                }
            };
            "#,
        );
        let output = run_probe(&plugin, &temp_app_dir("stale-notice"), "0.0.0");
        assert_eq!(
            output.error.as_deref(),
            Some("Grok session expired. Reconnect Grok in GrokBuild to refresh it.")
        );
        assert_eq!(output.lines.len(), 1);
        assert_eq!(output.statuses[0].text, "Stale");
    }
}
