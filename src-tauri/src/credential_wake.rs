//! Bounded credential wake for official CLIs. Not Window Starter: no model, no prompt.
//!
//! Per-provider table: executable + extra documented install dirs + argv + timeout.

use std::ffi::OsStr;
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use std::time::{Duration, Instant};

use serde::Serialize;

use crate::window_starter::{
    DEFAULT_TIMEOUT_SECS, find_executable_in_dirs, find_executable_on_path,
};

const POLL_INTERVAL_MS: u64 = 25;

#[derive(Debug, Clone, Copy)]
struct WakeSpec {
    id: &'static str,
    executable: &'static str,
    argv: &'static [&'static str],
}

const SPECS: &[WakeSpec] = &[
    WakeSpec {
        id: "antigravity",
        executable: "agy",
        argv: &["-p", "/quota", "--print-timeout", "1m"],
    },
    WakeSpec {
        id: "grok",
        executable: "grok",
        argv: &["models"],
    },
];

fn spec_for(provider_id: &str) -> Option<&'static WakeSpec> {
    SPECS.iter().find(|spec| spec.id == provider_id)
}

/// Pinned argv. Antigravity must not gain `--model` or a free-form prompt.
/// `--print-timeout 1m` is required: without it `/quota` dies with
/// `context canceled` even when stdout is drained.
pub fn wake_argv(provider_id: &str) -> Option<Vec<String>> {
    spec_for(provider_id).map(|spec| spec.argv.iter().map(|arg| (*arg).to_string()).collect())
}

/// Grok Build's documented install dir: `$HOME/.grok/bin` / `%USERPROFILE%\.grok\bin`.
pub fn documented_extra_dirs(provider_id: &str, home: &Path) -> Vec<PathBuf> {
    match provider_id {
        "grok" => vec![home.join(".grok").join("bin")],
        _ => Vec::new(),
    }
}

/// PATH helper first, then the provider's documented extra dirs.
pub fn find_provider_executable(
    executable: &str,
    extra_dirs: &[PathBuf],
    path_lookup: impl Fn(&str) -> Option<PathBuf>,
) -> Option<PathBuf> {
    if let Some(found) = path_lookup(executable) {
        return Some(found);
    }
    find_executable_in_dirs(executable, extra_dirs.iter().cloned())
}

fn find_live_executable(spec: &WakeSpec) -> Option<PathBuf> {
    let extra = dirs::home_dir()
        .map(|home| documented_extra_dirs(spec.id, &home))
        .unwrap_or_default();
    find_provider_executable(spec.executable, &extra, find_executable_on_path)
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub enum WakeStatus {
    Spawned,
    AlreadyRunning,
    Missing,
    Failed,
    Timeout,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct WakeResult {
    pub status: WakeStatus,
    pub duration_ms: u64,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CredentialWakeAvailability {
    pub antigravity: bool,
    pub grok: bool,
}

fn exact_executable_command(command: &str, executable: &str) -> bool {
    command
        .split_whitespace()
        .next()
        .and_then(|name| Path::new(name).file_name())
        .and_then(OsStr::to_str)
        .is_some_and(|name| name.eq_ignore_ascii_case(executable))
}

/// True when `ps -ax -o pid=,command=` output contains an exact binary name.
pub fn process_running_in(ps_stdout: &str, executable: &str) -> bool {
    for line in ps_stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() {
            continue;
        }
        let command = match trimmed.split_once(char::is_whitespace) {
            Some((_, rest)) => rest.trim(),
            None => trimmed,
        };
        if exact_executable_command(command, executable) {
            return true;
        }
    }
    false
}

fn process_running(executable: &str) -> bool {
    let output = match std::process::Command::new("/bin/ps")
        .args(["-ax", "-o", "pid=,command="])
        .stdin(std::process::Stdio::null())
        .output()
    {
        Ok(output) => output,
        Err(_) => return false,
    };
    if !output.status.success() {
        return false;
    }
    process_running_in(&String::from_utf8_lossy(&output.stdout), executable)
}

/// Decide without spawning. `Spawned` here means "caller should spawn".
pub fn decide_wake(running: bool, executable: Option<&Path>) -> WakeStatus {
    if running {
        WakeStatus::AlreadyRunning
    } else if executable.is_none() {
        WakeStatus::Missing
    } else {
        WakeStatus::Spawned
    }
}

pub fn run_wake_with<F>(
    running: bool,
    executable: Option<PathBuf>,
    argv: &[String],
    spawn: F,
) -> WakeResult
where
    F: FnOnce(&Path, &[String]) -> WakeResult,
{
    match decide_wake(running, executable.as_deref()) {
        WakeStatus::Spawned => {
            let path = executable.expect("decide_wake Spawned requires a path");
            spawn(&path, argv)
        }
        status => WakeResult {
            status,
            duration_ms: 0,
            exit_code: None,
        },
    }
}

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

#[cfg(unix)]
fn terminate_process_group(child: &mut std::process::Child) {
    let process_group = -(child.id() as libc::pid_t);
    unsafe {
        libc::kill(process_group, libc::SIGKILL);
    }
    let _ = child.kill();
}

#[cfg(not(unix))]
fn terminate_process_group(child: &mut std::process::Child) {
    let _ = child.kill();
}

/// Bounded spawn that drains stdout/stderr without keeping them.
/// `/dev/null` makes `agy -p /quota` die with SIGPIPE mid-slash-command.
fn run_silent(program: &Path, args: &[String], timeout: Duration) -> WakeResult {
    let mut command = std::process::Command::new(program);
    command.args(args);
    configure_process_group(&mut command);
    if let Some(home) = dirs::home_dir() {
        command.current_dir(home);
    }
    command
        .stdin(std::process::Stdio::null())
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    let start = Instant::now();
    let mut child = match command.spawn() {
        Ok(child) => child,
        Err(_) => {
            return WakeResult {
                status: WakeStatus::Failed,
                duration_ms: 0,
                exit_code: None,
            };
        }
    };

    let stdout = child.stdout.take().map(|mut pipe| {
        std::thread::spawn(move || {
            let _ = std::io::copy(&mut pipe, &mut std::io::sink());
        })
    });
    let stderr = child.stderr.take().map(|mut pipe| {
        std::thread::spawn(move || {
            let _ = std::io::copy(&mut pipe, &mut std::io::sink());
        })
    });

    let wait_status = loop {
        match child.try_wait() {
            Ok(Some(status)) => break status,
            Ok(None) => {
                if start.elapsed() > timeout {
                    terminate_process_group(&mut child);
                    let _ = child.wait();
                    let _ = stdout.and_then(|handle| handle.join().ok());
                    let _ = stderr.and_then(|handle| handle.join().ok());
                    return WakeResult {
                        status: WakeStatus::Timeout,
                        duration_ms: start.elapsed().as_millis() as u64,
                        exit_code: None,
                    };
                }
                std::thread::sleep(Duration::from_millis(POLL_INTERVAL_MS));
            }
            Err(_) => {
                let _ = child.kill();
                let _ = child.wait();
                let _ = stdout.and_then(|handle| handle.join().ok());
                let _ = stderr.and_then(|handle| handle.join().ok());
                return WakeResult {
                    status: WakeStatus::Failed,
                    duration_ms: start.elapsed().as_millis() as u64,
                    exit_code: None,
                };
            }
        }
    };

    let _ = stdout.and_then(|handle| handle.join().ok());
    let _ = stderr.and_then(|handle| handle.join().ok());

    WakeResult {
        status: if wait_status.success() {
            WakeStatus::Spawned
        } else {
            WakeStatus::Failed
        },
        duration_ms: start.elapsed().as_millis() as u64,
        exit_code: wait_status.code(),
    }
}

fn wake_lock() -> &'static Mutex<()> {
    static LOCK: std::sync::OnceLock<Mutex<()>> = std::sync::OnceLock::new();
    LOCK.get_or_init(|| Mutex::new(()))
}

pub fn run_credential_wake(provider_id: &str) -> Result<WakeResult, String> {
    let spec =
        spec_for(provider_id).ok_or_else(|| format!("unknown wake provider: {provider_id}"))?;
    let argv = wake_argv(provider_id).expect("spec_for matched");
    let _guard = wake_lock()
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner());
    Ok(run_wake_with(
        process_running(spec.executable),
        find_live_executable(spec),
        &argv,
        |path, args| {
            run_silent(
                path,
                args,
                Duration::from_secs(DEFAULT_TIMEOUT_SECS.clamp(1, 120)),
            )
        },
    ))
}

pub fn live_availability() -> CredentialWakeAvailability {
    CredentialWakeAvailability {
        antigravity: spec_for("antigravity")
            .is_some_and(|spec| find_live_executable(spec).is_some()),
        grok: spec_for("grok").is_some_and(|spec| find_live_executable(spec).is_some()),
    }
}

#[tauri::command]
pub async fn credential_wake(provider_id: String) -> Result<WakeResult, String> {
    tauri::async_runtime::spawn_blocking(move || run_credential_wake(&provider_id))
        .await
        .map_err(|error| format!("Credential wake task failed: {error}"))?
}

#[tauri::command]
pub fn credential_wake_availability() -> CredentialWakeAvailability {
    live_availability()
}

#[cfg(test)]
#[path = "credential_wake_tests.rs"]
mod tests;
