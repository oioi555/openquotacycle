//! Multi-account Claude discovery: one provider instance per Claude Code config dir.
//! Runs once at startup (see `plugin_engine::initialize_plugins`).

use crate::plugin_engine::manifest::LoadedPlugin;
use std::collections::HashSet;
use std::path::{Path, PathBuf};

pub const CLAUDE_BASE_ID: &str = "claude";
pub const CLAUDE_CONFIG_DIR_ENV: &str = "CLAUDE_CONFIG_DIR";
const CREDENTIALS_FILE: &str = ".credentials.json";

#[derive(Debug, Clone, PartialEq)]
pub struct ClaudeAccount {
    pub id: String,
    pub dir: PathBuf,
    /// Card suffix for non-primary accounts: `~/.claude-sub` → `sub`.
    pub label: String,
    /// Full `oauthAccount.emailAddress`, shown as the card title tooltip.
    pub email: Option<String>,
    pub primary: bool,
}

struct Identity {
    uuid: Option<String>,
    email: Option<String>,
}

/// Missing/malformed file → empty identity; never fails.
fn read_identity(account_file: &Path) -> Identity {
    let parsed = std::fs::read_to_string(account_file)
        .ok()
        .and_then(|text| serde_json::from_str::<serde_json::Value>(&text).ok());
    let field = |name: &str| -> Option<String> {
        parsed
            .as_ref()?
            .get("oauthAccount")?
            .get(name)?
            .as_str()
            .map(str::trim)
            .filter(|s| !s.is_empty())
            .map(str::to_string)
    };
    Identity {
        uuid: field("accountUuid"),
        email: field("emailAddress"),
    }
}

fn dir_name(dir: &Path) -> String {
    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    name.trim_start_matches('.').to_string()
}

/// `~/.claude-sub` → `sub`; other dirs → base name without leading `.`.
fn dir_label(dir: &Path) -> String {
    let name = dir
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    name.strip_prefix(".claude-")
        .unwrap_or_else(|| name.trim_start_matches('.'))
        .to_string()
}

fn canonical(dir: &Path) -> PathBuf {
    dir.canonicalize().unwrap_or_else(|_| dir.to_path_buf())
}

fn scan_suffixed_dirs(home: &Path) -> Vec<PathBuf> {
    let Ok(entries) = std::fs::read_dir(home) else {
        return Vec::new();
    };
    let mut dirs: Vec<PathBuf> = entries
        .flatten()
        .filter(|e| e.file_name().to_string_lossy().starts_with(".claude-"))
        .map(|e| e.path())
        .filter(|p| p.is_dir())
        .collect();
    dirs.sort();
    dirs
}

/// Discovers accounts in order: primary, scanned `~/.claude-*` (name order), configured dirs.
/// `primary_env` is the app's `CLAUDE_CONFIG_DIR` (if set).
pub fn discover_accounts(
    home: &Path,
    primary_env: Option<&str>,
    configured: &[PathBuf],
) -> Vec<ClaudeAccount> {
    let primary_env = primary_env.map(str::trim).filter(|s| !s.is_empty());
    let (primary_dir, primary_file) = match primary_env {
        Some(dir) => (PathBuf::from(dir), PathBuf::from(dir).join(".claude.json")),
        None => (home.join(".claude"), home.join(".claude.json")),
    };
    let primary_identity = read_identity(&primary_file);
    let mut accounts = vec![ClaudeAccount {
        id: CLAUDE_BASE_ID.to_string(),
        label: dir_label(&primary_dir),
        email: primary_identity.email,
        dir: canonical(&primary_dir),
        primary: true,
    }];
    let mut seen_dirs: HashSet<PathBuf> = HashSet::from([canonical(&primary_dir)]);
    // Dedicated dirs dedupe among themselves; the primary yields to them (see below).
    let mut seen_uuids: HashSet<String> = HashSet::new();
    let mut seen_ids: HashSet<String> = HashSet::from([CLAUDE_BASE_ID.to_string()]);

    let candidates = scan_suffixed_dirs(home)
        .into_iter()
        .chain(configured.iter().cloned());
    for dir in candidates {
        if !dir.join(CREDENTIALS_FILE).is_file() {
            continue;
        }
        let dir = canonical(&dir);
        if !seen_dirs.insert(dir.clone()) {
            continue;
        }
        let identity = read_identity(&dir.join(".claude.json"));
        if let Some(uuid) = &identity.uuid
            && seen_uuids.contains(uuid)
        {
            log::info!(
                "[claude-accounts] {} duplicates an earlier account; skipped",
                dir.display()
            );
            continue;
        }
        let key = match &identity.uuid {
            Some(uuid) => uuid.chars().take(8).collect::<String>(),
            None => dir_name(&dir),
        };
        let id = format!("{}@{}", CLAUDE_BASE_ID, key);
        if !seen_ids.insert(id.clone()) {
            log::warn!(
                "[claude-accounts] id {} already used; skipping {}",
                id,
                dir.display()
            );
            continue;
        }
        // Record only adopted uuids: a skipped dir must not hide the primary below.
        if let Some(uuid) = &identity.uuid {
            seen_uuids.insert(uuid.clone());
        }
        accounts.push(ClaudeAccount {
            id,
            label: dir_label(&dir),
            email: identity.email,
            dir,
            primary: false,
        });
    }
    // Account switchers (e.g. Orca) swap the login in the primary dir, so a dedicated
    // dir for the same account is the stable card; drop the duplicate primary.
    if let Some(uuid) = &primary_identity.uuid
        && seen_uuids.contains(uuid)
    {
        log::info!("[claude-accounts] primary duplicates a dedicated dir; omitted");
        accounts.retain(|a| !a.primary);
    }
    accounts
}

/// Adds one cloned `claude` plugin per non-primary account (right after `claude`).
/// Primary keeps its name; instances are `<name> · <label>`. All get the email tooltip.
/// Removes `claude` itself when the primary was omitted as a duplicate.
pub fn apply_accounts(plugins: &mut Vec<LoadedPlugin>, accounts: &[ClaudeAccount]) {
    let Some(index) = plugins.iter().position(|p| p.manifest.id == CLAUDE_BASE_ID) else {
        return;
    };
    if accounts.iter().all(|a| a.primary) {
        return;
    }
    let base = plugins[index].clone();
    let mut insert_at = index + 1;
    for account in accounts {
        if account.primary {
            plugins[index].account_email = account.email.clone();
            continue;
        }
        let mut instance = base.clone();
        instance.manifest.id = account.id.clone();
        instance.manifest.name = format!("{} · {}", base.manifest.name, account.label);
        instance.account_email = account.email.clone();
        instance.base_id = CLAUDE_BASE_ID.to_string();
        instance.env_overrides = vec![(
            CLAUDE_CONFIG_DIR_ENV.to_string(),
            account.dir.to_string_lossy().to_string(),
        )];
        plugins.insert(insert_at, instance);
        insert_at += 1;
    }
    if !accounts.iter().any(|a| a.primary) {
        plugins.remove(index);
    }
}

/// Startup entry: real home, app env, and config.json dirs.
pub fn expand_claude_instances(plugins: &mut Vec<LoadedPlugin>) {
    if !plugins.iter().any(|p| p.manifest.id == CLAUDE_BASE_ID) {
        return;
    }
    let Some(home) = dirs::home_dir() else {
        return;
    };
    let primary_env = crate::plugin_engine::host_api::resolve_env_value(CLAUDE_CONFIG_DIR_ENV);
    let configured = crate::config::load_claude_account_dirs(&home);
    let accounts = discover_accounts(&home, primary_env.as_deref(), &configured);
    apply_accounts(plugins, &accounts);
}

#[cfg(test)]
#[path = "claude_accounts_tests.rs"]
mod tests;
