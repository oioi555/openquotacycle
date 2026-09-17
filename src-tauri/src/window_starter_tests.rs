use super::*;
use crate::plugin_engine::manifest::{WindowStarterCapability, WindowStarterWindow};

fn session_window() -> WindowStarterWindow {
    WindowStarterWindow {
        id: "session".to_string(),
        line: "Session".to_string(),
        weekly_line: "Weekly".to_string(),
        enabled_by_default: None,
    }
}

fn capability(plugin_id: &str) -> WindowStarterCapability {
    match plugin_id {
        "claude" => WindowStarterCapability {
            enabled_by_default: true,
            default_runner: "claude".to_string(),
            allowed_runners: vec!["claude".to_string()],
            windows: vec![session_window()],
        },
        "codex" => WindowStarterCapability {
            enabled_by_default: true,
            default_runner: "codex".to_string(),
            allowed_runners: vec![
                "codex".to_string(),
                "opencode".to_string(),
                "hermes".to_string(),
                "pi".to_string(),
            ],
            windows: vec![session_window()],
        },
        "zai" => WindowStarterCapability {
            enabled_by_default: true,
            default_runner: "zcode".to_string(),
            allowed_runners: vec![
                "zcode".to_string(),
                "opencode".to_string(),
                "hermes".to_string(),
                "pi".to_string(),
            ],
            windows: vec![session_window()],
        },
        "antigravity" => WindowStarterCapability {
            enabled_by_default: false,
            default_runner: "agy".to_string(),
            allowed_runners: vec!["agy".to_string()],
            windows: vec![
                WindowStarterWindow {
                    id: "session".to_string(),
                    line: "Session".to_string(),
                    weekly_line: "Weekly".to_string(),
                    enabled_by_default: Some(false),
                },
                WindowStarterWindow {
                    id: "claude".to_string(),
                    line: "Claude".to_string(),
                    weekly_line: "Claude Wk".to_string(),
                    enabled_by_default: Some(false),
                },
            ],
        },
        _ => WindowStarterCapability {
            enabled_by_default: false,
            default_runner: "claude".to_string(),
            allowed_runners: vec!["claude".to_string()],
            windows: vec![session_window()],
        },
    }
}

fn args(plugin: &str, runner: &str, window: &str, prompt: &str) -> Vec<String> {
    command_args(plugin, runner, window, prompt).expect("pin row")
}

#[test]
fn catalog_has_seven_runners_in_stable_order() {
    assert_eq!(
        CATALOG_RUNNERS,
        [
            "claude", "codex", "zcode", "agy", "opencode", "hermes", "pi"
        ]
    );
}

#[test]
fn discover_returns_catalog_runners() {
    let statuses = discover_availability();
    assert_eq!(statuses.len(), 7);
    let ids: Vec<&str> = statuses.iter().map(|s| s.id.as_str()).collect();
    assert_eq!(
        ids,
        vec![
            "claude", "codex", "zcode", "agy", "opencode", "hermes", "pi"
        ]
    );
    assert_eq!(statuses[2].executable, "zcode");
}

#[test]
fn claude_haiku_args_via_claude_code_only() {
    let args = args("claude", "claude", "session", "probe now");
    assert_eq!(
        args,
        vec![
            "-p",
            "probe now",
            "--model",
            "claude-haiku-4-5",
            "--tools",
            "",
            "--max-turns",
            "1",
            "--no-session-persistence"
        ]
    );
    assert!(
        !args
            .iter()
            .any(|a| a.contains(';') || a.contains("&&") || a.contains('|'))
    );
}

#[test]
fn claude_third_party_harnesses_have_no_pin() {
    assert!(command_args("claude", "opencode", "session", "x").is_none());
    assert!(command_args("claude", "hermes", "session", "x").is_none());
    assert!(command_args("claude", "pi", "session", "x").is_none());
}

#[test]
fn claude_rejects_third_party_harness_without_spawn() {
    for runner in ["opencode", "hermes", "pi"] {
        let result = run_window_starter(
            "claude",
            runner,
            "Session",
            "ping",
            None,
            Some(&capability("claude")),
        );
        assert_eq!(result.status, RunStatus::Unsupported);
        assert!(result.executable.is_empty());
    }
}

#[test]
fn codex_first_party_args() {
    assert_eq!(
        args("codex", "codex", "session", "ping"),
        vec![
            "exec",
            "--ephemeral",
            "--skip-git-repo-check",
            "--sandbox",
            "read-only",
            "-m",
            "gpt-5.6-luna",
            "-c",
            "model_reasoning_effort=\"none\"",
            "ping"
        ]
    );
}

#[test]
fn codex_opencode_pins_luna() {
    assert_eq!(
        args("codex", "opencode", "session", "ping"),
        vec!["run", "ping", "-m", "openai/gpt-5.6-luna"]
    );
    assert!(!args("codex", "opencode", "session", "ping").contains(&"--auto".to_string()));
}

#[test]
fn codex_hermes_pins_openai_codex() {
    assert_eq!(
        args("codex", "hermes", "session", "ping"),
        vec![
            "-z",
            "ping",
            "--provider",
            "openai-codex",
            "-m",
            "gpt-5.6-luna"
        ]
    );
    assert!(!args("codex", "hermes", "session", "ping").contains(&"--yolo".to_string()));
}

#[test]
fn codex_pi_pins_openai_codex_luna() {
    let args = args("codex", "pi", "session", "ping");
    assert_eq!(
        args,
        vec![
            "-p",
            "ping",
            "--model",
            "openai-codex/gpt-5.6-luna",
            "--no-session",
            "--no-tools",
            "--no-context-files",
            "--no-approve"
        ]
    );
    assert!(!args.contains(&"--api-key".to_string()));
    assert!(
        !args
            .iter()
            .any(|a| a.starts_with("openai/") && *a != "openai-codex/gpt-5.6-luna")
    );
}

#[test]
fn zai_zcode_prompt_without_model() {
    let args = args("zai", "zcode", "session", "wake");
    assert_eq!(args, vec!["--prompt", "wake"]);
    assert!(!args.contains(&"--max-turns".to_string()));
}

#[test]
fn zai_rejects_claude_code_without_spawn() {
    let result = run_window_starter(
        "zai",
        "claude",
        "Session",
        "ping",
        None,
        Some(&capability("zai")),
    );
    assert_eq!(result.status, RunStatus::Unsupported);
    assert!(result.executable.is_empty());
    assert!(command_args("zai", "claude", "session", "ping").is_none());
}

#[test]
fn zai_opencode_pins_coding_plan() {
    let args = args("zai", "opencode", "session", "wake");
    assert_eq!(
        args,
        vec!["run", "wake", "-m", "zai-coding-plan/glm-5.3-flash"]
    );
    assert!(!args.contains(&"--auto".to_string()));
    assert!(!args.iter().any(|a| a.contains("opencode-go/")));
}

#[test]
fn zai_hermes_pins_glm_flash() {
    assert_eq!(
        args("zai", "hermes", "session", "wake"),
        vec!["-z", "wake", "--provider", "zai", "-m", "glm-5.3-flash"]
    );
}

#[test]
fn zai_pi_pins_coding_plan() {
    let args = args("zai", "pi", "session", "wake");
    assert_eq!(
        args,
        vec![
            "-p",
            "wake",
            "--model",
            "zai/glm-5.3-flash",
            "--no-session",
            "--no-tools",
            "--no-context-files",
            "--no-approve"
        ]
    );
    assert!(!args.contains(&"--api-key".to_string()));
    assert!(
        !args
            .iter()
            .any(|a| a.contains("opencode-go/") || a.contains("zai-api"))
    );
}

#[test]
fn antigravity_session_pins_flash_low_without_skip_permissions() {
    let args = args("antigravity", "agy", "session", "wake");
    assert_eq!(args, vec!["-p", "wake", "--model", "gemini-3.8-flash-low"]);
    assert!(
        !args
            .iter()
            .any(|a| a.contains("dangerously-skip-permissions"))
    );
}

#[test]
fn antigravity_claude_window_pins_sonnet() {
    assert_eq!(
        args("antigravity", "agy", "claude", "wake"),
        vec!["-p", "wake", "--model", "claude-sonnet-4-6"]
    );
}

#[test]
fn unknown_plugin_or_window_is_unsupported() {
    let missing_plugin = run_window_starter("openai", "codex", "Session", "ping", None, None);
    assert_eq!(missing_plugin.status, RunStatus::Unsupported);
    assert_eq!(missing_plugin.provider_id, "openai");
    assert!(missing_plugin.executable.is_empty());

    let bad_line = run_window_starter(
        "claude",
        "claude",
        "Weekly",
        "ping",
        None,
        Some(&capability("claude")),
    );
    assert_eq!(bad_line.status, RunStatus::Unsupported);
}

#[test]
fn find_executable_resolves_on_path() {
    let dir = std::env::temp_dir().join(format!("openquotacycle-ws-test-{}", std::process::id()));
    std::fs::create_dir_all(&dir).unwrap();
    let exe = dir.join("ws-fake-bin");
    std::fs::write(&exe, b"#!/bin/sh\nexit 0\n").unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&exe, std::fs::Permissions::from_mode(0o755)).unwrap();
    }

    let found = find_executable_in_dirs("ws-fake-bin", std::iter::once(dir.clone()));
    assert_eq!(
        found.unwrap().file_name().unwrap().to_str(),
        Some("ws-fake-bin")
    );

    let non_exec = dir.join("ws-fake-non-exec");
    std::fs::write(&non_exec, b"x").unwrap();
    #[cfg(unix)]
    {
        use std::os::unix::fs::PermissionsExt;
        std::fs::set_permissions(&non_exec, std::fs::Permissions::from_mode(0o644)).unwrap();
    }
    assert!(find_executable_in_dirs("ws-fake-non-exec", std::iter::once(dir.clone())).is_none());
    assert!(
        find_executable_in_dirs(
            "definitely-not-a-real-bin-xyz",
            std::iter::once(dir.clone())
        )
        .is_none()
    );
    std::fs::remove_dir_all(&dir).unwrap();
}

#[test]
fn run_bounded_reports_success_with_output() {
    let run = run_bounded(
        "sh",
        &["-c", "printf 'hello window starter'"].map(String::from),
        Duration::from_secs(10),
        4096,
    );
    assert_eq!(run.status, RunStatus::Success);
    assert_eq!(run.exit_code, Some(0));
    assert_eq!(run.output, "hello window starter");
    assert!(!run.truncated);
}

#[test]
fn run_bounded_reports_nonzero_exit() {
    let run = run_bounded(
        "sh",
        &["-c", "printf 'boom' >&2; exit 3"].map(String::from),
        Duration::from_secs(10),
        4096,
    );
    assert_eq!(run.status, RunStatus::Failed);
    assert_eq!(run.exit_code, Some(3));
    assert_eq!(run.output, "boom");
}

#[test]
fn run_bounded_times_out_and_kills_process() {
    let run = run_bounded(
        "sh",
        &["-c", "sleep 30"].map(String::from),
        Duration::from_millis(300),
        4096,
    );
    assert_eq!(run.status, RunStatus::Timeout);
}

#[test]
fn run_bounded_truncates_oversized_output() {
    let big = "x".repeat(10_000);
    let run = run_bounded(
        "sh",
        &["-c", &format!("printf '%s' '{}'", big)].map(String::from),
        Duration::from_secs(10),
        1024,
    );
    assert_eq!(run.status, RunStatus::Success);
    assert_eq!(run.output.len(), 1024);
    assert!(run.truncated);
}

#[test]
fn run_bounded_redacts_sensitive_output() {
    let run = run_bounded(
        "sh",
        &[
            "-c",
            "printf 'key=sk-1234567890abcdef path=/Users/rebers/.claude'",
        ]
        .map(String::from),
        Duration::from_secs(10),
        4096,
    );
    assert_eq!(run.status, RunStatus::Success);
    assert!(
        !run.output.contains("sk-1234567890abcdef"),
        "got: {}",
        run.output
    );
    assert!(
        !run.output.contains("/Users/rebers/.claude"),
        "got: {}",
        run.output
    );
}

#[test]
fn run_bounded_redacts_api_key_flag_output() {
    let run = run_bounded(
        "sh",
        &["-c", "printf 'pi --api-key sk-1234567890abcdef'"].map(String::from),
        Duration::from_secs(10),
        4096,
    );
    assert_eq!(run.status, RunStatus::Success);
    assert!(
        !run.output.contains("sk-1234567890abcdef"),
        "got: {}",
        run.output
    );
}

#[test]
fn run_bounded_reports_failed_spawn_for_missing_program() {
    let run = run_bounded(
        "definitely-not-a-real-bin-xyz",
        &["ping"].map(String::from),
        Duration::from_secs(1),
        4096,
    );
    assert_eq!(run.status, RunStatus::Failed);
    assert_eq!(run.exit_code, None);
}
