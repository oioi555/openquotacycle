use super::*;
use crate::window_starter::command_args;
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_home(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .expect("time")
        .as_nanos();
    let dir = std::env::temp_dir().join(format!(
        "openquotacycle-wake-{label}-{}-{nanos}",
        std::process::id()
    ));
    fs::create_dir_all(&dir).expect("tmp home");
    dir
}

#[cfg(unix)]
fn write_executable(path: &Path) {
    use std::os::unix::fs::PermissionsExt;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("parent dir");
    }
    fs::write(path, b"#!/bin/sh\nexit 0\n").expect("write stub");
    let mut perms = fs::metadata(path).expect("meta").permissions();
    perms.set_mode(0o755);
    fs::set_permissions(path, perms).expect("chmod");
}

#[cfg(not(unix))]
fn write_executable(path: &Path) {
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).expect("parent dir");
    }
    fs::write(path, b"stub").expect("write stub");
}

#[test]
fn antigravity_argv_is_quota_slash_without_model_or_prompt() {
    let args = wake_argv("antigravity").expect("antigravity spec");
    assert_eq!(args, vec!["-p", "/quota", "--print-timeout", "1m"]);
    assert!(!args.iter().any(|arg| arg.contains("model")));
    assert!(
        !args
            .iter()
            .any(|arg| arg.contains("dangerously-skip-permissions"))
    );
    let starter = command_args("antigravity", "agy", "session", "wake").expect("pin");
    assert_ne!(starter, args);
    assert!(starter.iter().any(|arg| arg == "--model"));
}

#[test]
fn grok_argv_is_exactly_models() {
    let args = wake_argv("grok").expect("grok spec");
    assert_eq!(args, vec!["models"]);
    assert!(!args.iter().any(|arg| arg == "-p"));
    assert!(!args.iter().any(|arg| arg.contains("single")));
    assert!(!args.iter().any(|arg| arg == "--model" || arg == "-m"));
    assert!(command_args("grok", "grok", "session", "wake").is_none());
}

#[test]
fn grok_is_not_a_window_starter_catalog_runner() {
    assert!(!crate::window_starter::CATALOG_RUNNERS.contains(&"grok"));
}

#[test]
fn exact_agy_matches_binary_name_only() {
    assert!(exact_executable_command("/usr/bin/agy -p /quota", "agy"));
    assert!(exact_executable_command("agy", "agy"));
    assert!(!exact_executable_command(
        "/usr/bin/agy-helper --conversation x",
        "agy"
    ));
    assert!(!exact_executable_command(
        "language_server_linux --app_data_dir antigravity",
        "agy",
    ));
}

#[test]
fn exact_grok_matches_binary_name_only() {
    assert!(exact_executable_command(
        "/home/user/.grok/bin/grok models",
        "grok"
    ));
    assert!(exact_executable_command("grok", "grok"));
    assert!(!exact_executable_command(
        "/usr/bin/grok-helper models",
        "grok"
    ));
    assert!(!exact_executable_command("agy models", "grok"));
}

#[test]
fn ps_listing_detects_running_agy() {
    let listing = "  12 /usr/bin/bash\n  44 /usr/bin/agy -p /quota\n";
    assert!(process_running_in(listing, "agy"));
    assert!(!process_running_in(
        "  12 /usr/bin/agy-helper\n  13 /usr/bin/bash\n",
        "agy",
    ));
}

#[test]
fn ps_listing_detects_running_grok() {
    let listing = "  12 /usr/bin/bash\n  88 /home/user/.grok/bin/grok models\n";
    assert!(process_running_in(listing, "grok"));
    assert!(!process_running_in("  12 /usr/bin/grok-helper\n", "grok"));
}

#[test]
fn running_agy_does_not_spawn() {
    let mut spawned = false;
    let argv = wake_argv("antigravity").unwrap();
    let result = run_wake_with(true, Some(PathBuf::from("/usr/bin/agy")), &argv, |_, _| {
        spawned = true;
        WakeResult {
            status: WakeStatus::Spawned,
            duration_ms: 1,
            exit_code: Some(0),
        }
    });
    assert!(!spawned);
    assert_eq!(result.status, WakeStatus::AlreadyRunning);
    assert_eq!(result.exit_code, None);
}

#[test]
fn running_grok_does_not_spawn() {
    let mut spawned = false;
    let argv = wake_argv("grok").unwrap();
    let result = run_wake_with(true, Some(PathBuf::from("/usr/bin/grok")), &argv, |_, _| {
        spawned = true;
        WakeResult {
            status: WakeStatus::Spawned,
            duration_ms: 1,
            exit_code: Some(0),
        }
    });
    assert!(!spawned);
    assert_eq!(result.status, WakeStatus::AlreadyRunning);
}

#[test]
fn missing_executable_does_not_spawn() {
    let mut spawned = false;
    let argv = wake_argv("grok").unwrap();
    let result = run_wake_with(false, None, &argv, |_, _| {
        spawned = true;
        WakeResult {
            status: WakeStatus::Spawned,
            duration_ms: 1,
            exit_code: Some(0),
        }
    });
    assert!(!spawned);
    assert_eq!(result.status, WakeStatus::Missing);
}

#[test]
fn spawn_path_receives_quota_argv() {
    let mut seen: Option<(String, Vec<String>)> = None;
    let argv = wake_argv("antigravity").unwrap();
    let result = run_wake_with(
        false,
        Some(PathBuf::from("/usr/bin/agy")),
        &argv,
        |path, args| {
            seen = Some((path.to_string_lossy().into_owned(), args.to_vec()));
            WakeResult {
                status: WakeStatus::Spawned,
                duration_ms: 7,
                exit_code: Some(0),
            }
        },
    );
    assert_eq!(result.status, WakeStatus::Spawned);
    let (path, args) = seen.expect("spawned");
    assert_eq!(path, "/usr/bin/agy");
    assert_eq!(args, vec!["-p", "/quota", "--print-timeout", "1m"]);
}

#[test]
fn spawn_path_receives_grok_models_argv() {
    let mut seen: Option<Vec<String>> = None;
    let argv = wake_argv("grok").unwrap();
    let result = run_wake_with(
        false,
        Some(PathBuf::from("/usr/bin/grok")),
        &argv,
        |_, args| {
            seen = Some(args.to_vec());
            WakeResult {
                status: WakeStatus::Spawned,
                duration_ms: 1,
                exit_code: Some(0),
            }
        },
    );
    assert_eq!(result.status, WakeStatus::Spawned);
    assert_eq!(seen.expect("spawned"), vec!["models"]);
}

#[test]
fn grok_found_in_documented_install_dir_without_path() {
    let home = temp_home("doc-dir");
    let grok = home.join(".grok").join("bin").join("grok");
    write_executable(&grok);
    let extra = documented_extra_dirs("grok", &home);
    let found = find_provider_executable("grok", &extra, |_| None);
    assert_eq!(found.as_deref(), Some(grok.as_path()));
    let _ = fs::remove_dir_all(&home);
}

#[test]
fn grok_found_on_path_without_documented_dir() {
    let home = temp_home("path-only");
    let on_path = home.join("path-bin").join("grok");
    write_executable(&on_path);
    let extra = documented_extra_dirs("grok", &home);
    let found = find_provider_executable("grok", &extra, |name| {
        if name == "grok" {
            Some(on_path.clone())
        } else {
            None
        }
    });
    assert_eq!(found.as_deref(), Some(on_path.as_path()));
    let _ = fs::remove_dir_all(&home);
}

#[test]
fn grok_missing_everywhere_is_none() {
    let home = temp_home("missing");
    let extra = documented_extra_dirs("grok", &home);
    assert!(find_provider_executable("grok", &extra, |_| None).is_none());
    let _ = fs::remove_dir_all(&home);
}

#[test]
fn antigravity_has_no_documented_extra_dirs() {
    let home = temp_home("agy-extra");
    assert!(documented_extra_dirs("antigravity", &home).is_empty());
    let _ = fs::remove_dir_all(&home);
}

#[test]
fn unknown_provider_has_no_argv() {
    assert!(wake_argv("claude").is_none());
}
