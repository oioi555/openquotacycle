//! Native Window Starter: host runner catalog + pin table + bounded execution.
//!
//! Plugins declare whether they participate. The host owns executables and argv.
//! The WebView sends plugin id, runner id, window line, and prompt — never argv.

use std::path::PathBuf;
use std::time::{Duration, Instant};

use serde::Serialize;

use crate::plugin_engine::host_api;
use crate::plugin_engine::manifest::WindowStarterCapability;

/// Default timeout for a single window-start attempt.
pub const DEFAULT_TIMEOUT_SECS: u64 = 60;
/// Cap on bytes of combined output retained per attempt.
const MAX_OUTPUT_BYTES: usize = 4096;
/// Poll interval while waiting for a child process.
const POLL_INTERVAL_MS: u64 = 25;

/// Host catalog runner ids (executable name matches id).
pub const CATALOG_RUNNERS: [&str; 7] = [
    "claude", "codex", "zcode", "agy", "opencode", "hermes", "pi",
];

/// Structured executable-availability status for one catalog runner.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProviderStatus {
    pub id: String,
    pub executable: String,
    pub available: bool,
}

/// Outcome of a single bounded execution attempt.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "lowercase")]
pub enum RunStatus {
    Success,
    Failed,
    Timeout,
    Unsupported,
}

/// Structured result returned to the frontend for one attempt.
#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowStarterRun {
    pub provider_id: String,
    pub runner_id: String,
    pub window_line: String,
    pub executable: String,
    pub status: RunStatus,
    pub exit_code: Option<i32>,
    pub duration_ms: u64,
    pub output: String,
    pub output_truncated: bool,
}

/// Result of a generic bounded subprocess run (testable core).
#[derive(Debug)]
struct BoundedRun {
    exit_code: Option<i32>,
    status: RunStatus,
    duration_ms: u64,
    output: String,
    truncated: bool,
}

fn catalog_executable(runner_id: &str) -> Option<&'static str> {
    CATALOG_RUNNERS.iter().copied().find(|id| *id == runner_id)
}

/// Pin table: `(plugin × runner × window id)` → argv. `None` is Unsupported.
pub fn command_args(
    plugin_id: &str,
    runner_id: &str,
    window_id: &str,
    prompt: &str,
) -> Option<Vec<String>> {
    match (plugin_id, runner_id, window_id) {
        ("claude", "claude", _) => Some(vec![
            "-p".to_string(),
            prompt.to_string(),
            "--model".to_string(),
            "claude-haiku-4-5".to_string(),
            "--tools".to_string(),
            String::new(),
            "--max-turns".to_string(),
            "1".to_string(),
            "--no-session-persistence".to_string(),
        ]),
        ("codex", "codex", _) => Some(vec![
            "exec".to_string(),
            "--ephemeral".to_string(),
            "--skip-git-repo-check".to_string(),
            "--sandbox".to_string(),
            "read-only".to_string(),
            "-m".to_string(),
            "gpt-5.6-luna".to_string(),
            "-c".to_string(),
            "model_reasoning_effort=\"none\"".to_string(),
            prompt.to_string(),
        ]),
        ("codex", "opencode", _) => Some(opencode_args(prompt, "openai/gpt-5.6-luna")),
        ("codex", "hermes", _) => Some(hermes_args(prompt, "openai-codex", "gpt-5.6-luna")),
        ("codex", "pi", _) => Some(pi_args(prompt, "openai-codex/gpt-5.6-luna")),
        // zcode 0.16.5 help lists --max-turns, but parseArgs rejects it.
        ("zai", "zcode", _) => Some(vec!["--prompt".to_string(), prompt.to_string()]),
        ("zai", "opencode", _) => Some(opencode_args(prompt, "zai-coding-plan/glm-5.3-flash")),
        ("zai", "hermes", _) => Some(hermes_args(prompt, "zai", "glm-5.3-flash")),
        ("zai", "pi", _) => Some(pi_args(prompt, "zai/glm-5.3-flash")),
        ("antigravity", "agy", "session") => Some(agy_args(prompt, "gemini-3.8-flash-low")),
        ("antigravity", "agy", "claude") => Some(agy_args(prompt, "claude-sonnet-4-6")),
        _ => None,
    }
}

fn opencode_args(prompt: &str, model: &str) -> Vec<String> {
    vec![
        "run".to_string(),
        prompt.to_string(),
        "-m".to_string(),
        model.to_string(),
    ]
}

fn hermes_args(prompt: &str, provider: &str, model: &str) -> Vec<String> {
    vec![
        "-z".to_string(),
        prompt.to_string(),
        "--provider".to_string(),
        provider.to_string(),
        "-m".to_string(),
        model.to_string(),
    ]
}

fn pi_args(prompt: &str, model: &str) -> Vec<String> {
    vec![
        "-p".to_string(),
        prompt.to_string(),
        "--model".to_string(),
        model.to_string(),
        "--no-session".to_string(),
        "--no-tools".to_string(),
        "--no-context-files".to_string(),
        "--no-approve".to_string(),
    ]
}

fn agy_args(prompt: &str, model: &str) -> Vec<String> {
    vec![
        "-p".to_string(),
        prompt.to_string(),
        "--model".to_string(),
        model.to_string(),
    ]
}

fn unsupported_run(plugin_id: &str, runner_id: &str, window_line: &str) -> WindowStarterRun {
    WindowStarterRun {
        provider_id: plugin_id.to_string(),
        runner_id: runner_id.to_string(),
        window_line: window_line.to_string(),
        executable: String::new(),
        status: RunStatus::Unsupported,
        exit_code: None,
        duration_ms: 0,
        output: String::new(),
        output_truncated: false,
    }
}

/// Search an explicit set of directories for an executable (side-effect-free).
pub(crate) fn find_executable_in_dirs<I>(name: &str, dirs: I) -> Option<PathBuf>
where
    I: IntoIterator<Item = PathBuf>,
{
    for dir in dirs {
        let candidate = dir.join(name);
        if !candidate.is_file() {
            continue;
        }
        #[cfg(unix)]
        {
            use std::os::unix::fs::PermissionsExt;
            if let Ok(meta) = candidate.metadata() {
                if meta.permissions().mode() & 0o111 != 0 {
                    return Some(candidate);
                }
            }
        }
        #[cfg(not(unix))]
        {
            return Some(candidate);
        }
    }
    None
}

/// Locate an executable on `PATH` without executing it (side-effect-free).
pub(crate) fn find_executable_on_path(name: &str) -> Option<PathBuf> {
    let mut search_dirs = Vec::new();
    if let Some(home) = dirs::home_dir() {
        search_dirs.push(home.join(".local/bin"));
        search_dirs.push(home.join(".bun/bin"));
        search_dirs.push(home.join(".nvm/current/bin"));
        search_dirs.push(home.join(".npm-global/bin"));
    }
    search_dirs.extend([
        PathBuf::from("/usr/local/bin"),
        PathBuf::from("/opt/homebrew/bin"),
    ]);
    if let Some(path_var) = std::env::var_os("PATH") {
        search_dirs.extend(std::env::split_paths(&path_var));
    }
    find_executable_in_dirs(name, search_dirs)
}

/// Side-effect-free availability discovery for every catalog runner.
pub fn discover_availability() -> Vec<ProviderStatus> {
    CATALOG_RUNNERS
        .iter()
        .map(|runner_id| ProviderStatus {
            id: runner_id.to_string(),
            executable: runner_id.to_string(),
            available: find_executable_on_path(runner_id).is_some(),
        })
        .collect()
}

/// Configure the child into its own process group so timeout cleanup can kill
/// the whole tree.
#[cfg(unix)]
fn configure_process_group(command: &mut std::process::Command) {
    use std::os::unix::process::CommandExt;
    unsafe {
        command.pre_exec(|| {
            if libc::setpgid(0, 0) == -1 {
                return Err(std::io::Error::last_os_error());
            }
            Ok(())
        });
    }
}

#[cfg(not(unix))]
fn configure_process_group(_command: &mut std::process::Command) {}

/// Kill the child's whole process group, then fall back to the direct child.
#[cfg(unix)]
fn terminate_process_group(child: &mut std::process::Child) {
    let process_group = -(child.id() as libc::pid_t);
    // Ignore ESRCH: the group may have already exited.
    unsafe {
        libc::kill(process_group, libc::SIGKILL);
    }
    let _ = child.kill();
}

#[cfg(not(unix))]
fn terminate_process_group(child: &mut std::process::Child) {
    let _ = child.kill();
}

/// Truncate to a bounded number of bytes (UTF-8 safe) and redact sensitive
/// content using the host redaction boundary.
fn truncate_and_redact(output: &[u8], max_bytes: usize) -> (String, bool) {
    let mut end = output.len().min(max_bytes);
    while end > 0 && !std::str::from_utf8(&output[..end]).is_ok() {
        end -= 1;
    }
    let text = String::from_utf8_lossy(&output[..end]).into_owned();
    let truncated = output.len() > end;
    (host_api::redact_log_message(&text), truncated)
}

/// Run a command directly (no shell) with a timeout and process-group cleanup.
fn run_bounded(program: &str, args: &[String], timeout: Duration, max_bytes: usize) -> BoundedRun {
    let mut command = std::process::Command::new(program);
    command.args(args);
    configure_process_group(&mut command);
    command
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let start = Instant::now();
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(_) => {
            return BoundedRun {
                exit_code: None,
                status: RunStatus::Failed,
                duration_ms: 0,
                output: String::new(),
                truncated: false,
            };
        }
    };

    let mut stdout_reader = child.stdout.take().map(|mut stdout| {
        std::thread::spawn(move || {
            let mut v = Vec::new();
            let _ = std::io::Read::read_to_end(&mut stdout, &mut v);
            v
        })
    });
    let mut stderr_reader = child.stderr.take().map(|mut stderr| {
        std::thread::spawn(move || {
            let mut v = Vec::new();
            let _ = std::io::Read::read_to_end(&mut stderr, &mut v);
            v
        })
    });

    let status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                if start.elapsed() > timeout {
                    terminate_process_group(&mut child);
                    let _ = child.wait();
                    let _ = stdout_reader.take().and_then(|r| r.join().ok());
                    let _ = stderr_reader.take().and_then(|r| r.join().ok());
                    return BoundedRun {
                        exit_code: None,
                        status: RunStatus::Timeout,
                        duration_ms: start.elapsed().as_millis() as u64,
                        output: "timed out".to_string(),
                        truncated: false,
                    };
                }
                std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = stdout_reader.take().and_then(|r| r.join().ok());
                let _ = stderr_reader.take().and_then(|r| r.join().ok());
                return BoundedRun {
                    exit_code: None,
                    status: RunStatus::Failed,
                    duration_ms: start.elapsed().as_millis() as u64,
                    output: String::new(),
                    truncated: false,
                };
            }
        }
    };

    let stdout = stdout_reader
        .take()
        .and_then(|r| r.join().ok())
        .unwrap_or_default();
    let stderr = stderr_reader
        .take()
        .and_then(|r| r.join().ok())
        .unwrap_or_default();

    let mut combined = stdout;
    combined.extend_from_slice(&stderr);
    let (output, truncated) = truncate_and_redact(&combined, max_bytes);
    let run_status = if status.success() {
        RunStatus::Success
    } else {
        RunStatus::Failed
    };

    BoundedRun {
        exit_code: status.code(),
        status: run_status,
        duration_ms: start.elapsed().as_millis() as u64,
        output,
        truncated,
    }
}

/// Resolve a declared window from the progress-line label the frontend sends.
pub fn match_window<'a>(
    capability: &'a WindowStarterCapability,
    window_line: &str,
) -> Option<&'a crate::plugin_engine::manifest::WindowStarterWindow> {
    capability
        .windows
        .iter()
        .find(|window| window.line == window_line)
}

/// Run the pinned command for a plugin/runner/window with a bounded window.
pub fn run_window_starter(
    plugin_id: &str,
    runner_id: &str,
    window_line: &str,
    prompt: &str,
    timeout_secs: Option<u64>,
    capability: Option<&WindowStarterCapability>,
) -> WindowStarterRun {
    let Some(capability) = capability else {
        return unsupported_run(plugin_id, runner_id, window_line);
    };
    if !capability.allowed_runners.iter().any(|id| id == runner_id) {
        return unsupported_run(plugin_id, runner_id, window_line);
    }
    let Some(window) = match_window(capability, window_line) else {
        return unsupported_run(plugin_id, runner_id, window_line);
    };
    let Some(executable_name) = catalog_executable(runner_id) else {
        return unsupported_run(plugin_id, runner_id, window_line);
    };
    let Some(args) = command_args(plugin_id, runner_id, &window.id, prompt) else {
        return unsupported_run(plugin_id, runner_id, window_line);
    };

    let executable_path = find_executable_on_path(executable_name);
    let executable = executable_path
        .as_ref()
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_else(|| executable_name.to_string());
    let timeout = Duration::from_secs(timeout_secs.unwrap_or(DEFAULT_TIMEOUT_SECS).clamp(1, 120));
    let run = run_bounded(&executable, &args, timeout, MAX_OUTPUT_BYTES);

    WindowStarterRun {
        provider_id: plugin_id.to_string(),
        runner_id: runner_id.to_string(),
        window_line: window_line.to_string(),
        executable,
        status: run.status,
        exit_code: run.exit_code,
        duration_ms: run.duration_ms,
        output: run.output,
        output_truncated: run.truncated,
    }
}

/// Tauri command: discover executable availability for catalog runners.
#[tauri::command]
pub fn window_starter_discover() -> Vec<ProviderStatus> {
    discover_availability()
}

/// Tauri command: run a pinned CLI for one plugin/runner/window.
#[tauri::command]
pub async fn window_starter_run(
    state: tauri::State<'_, std::sync::Mutex<crate::AppState>>,
    plugin_id: String,
    runner_id: String,
    window_line: String,
    prompt: String,
    timeout_secs: Option<u64>,
) -> Result<WindowStarterRun, String> {
    let capability = {
        let plugins = {
            let locked = state
                .lock()
                .map_err(|_| "plugin state poisoned".to_string())?;
            locked.plugins.clone()
        };
        plugins
            .into_iter()
            .find(|plugin| plugin.manifest.id == plugin_id)
            .and_then(|plugin| plugin.window_starter)
    };
    tauri::async_runtime::spawn_blocking(move || {
        run_window_starter(
            &plugin_id,
            &runner_id,
            &window_line,
            &prompt,
            timeout_secs,
            capability.as_ref(),
        )
    })
    .await
    .map_err(|error| format!("Window Starter task failed: {error}"))
}

#[cfg(test)]
#[path = "window_starter_tests.rs"]
mod tests;
