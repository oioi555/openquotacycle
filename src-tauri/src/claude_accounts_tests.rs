use super::*;
use crate::plugin_engine::manifest::PluginManifest;
use std::time::{SystemTime, UNIX_EPOCH};

fn temp_home(label: &str) -> PathBuf {
    let nanos = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap_or_default()
        .as_nanos();
    let dir = std::env::temp_dir().join(format!("oqc-claude-accounts-{}-{}", label, nanos));
    std::fs::create_dir_all(&dir).unwrap();
    dir.canonicalize().unwrap()
}

fn login(dir: &Path, account: Option<(&str, &str)>) {
    std::fs::create_dir_all(dir).unwrap();
    std::fs::write(dir.join(".credentials.json"), "{}").unwrap();
    if let Some((uuid, email)) = account {
        write_account(&dir.join(".claude.json"), uuid, email);
    }
}

fn write_account(file: &Path, uuid: &str, email: &str) {
    let json = serde_json::json!({"oauthAccount": {"accountUuid": uuid, "emailAddress": email}});
    std::fs::write(file, json.to_string()).unwrap();
}

fn ids(accounts: &[ClaudeAccount]) -> Vec<&str> {
    accounts.iter().map(|a| a.id.as_str()).collect()
}

#[test]
fn single_login_keeps_plain_claude() {
    let home = temp_home("single");
    login(&home.join(".claude"), None);
    let accounts = discover_accounts(&home, None, &[]);
    assert_eq!(ids(&accounts), vec!["claude"]);
    assert!(accounts[0].primary);
}

#[test]
fn suffixed_dir_becomes_instance_with_suffix_label() {
    let home = temp_home("suffixed");
    login(&home.join(".claude"), None);
    write_account(&home.join(".claude.json"), "aaaa0000-x", "main@example.com");
    login(
        &home.join(".claude-b"),
        Some(("1234abcd-5678", "work@example.com")),
    );
    let accounts = discover_accounts(&home, None, &[]);
    assert_eq!(ids(&accounts), vec!["claude", "claude@1234abcd"]);
    assert_eq!(accounts[0].email.as_deref(), Some("main@example.com"));
    assert_eq!(accounts[1].label, "b");
    assert_eq!(accounts[1].email.as_deref(), Some("work@example.com"));
    assert_eq!(accounts[1].dir, home.join(".claude-b"));
}

#[test]
fn configured_dir_outside_convention() {
    let home = temp_home("configured");
    let extra = home.join("srv").join("acc1");
    login(&extra, None);
    let accounts = discover_accounts(&home, None, std::slice::from_ref(&extra));
    assert_eq!(ids(&accounts), vec!["claude", "claude@acc1"]);
    assert_eq!(accounts[1].label, "acc1");
}

#[test]
fn dir_without_credentials_is_ignored() {
    let home = temp_home("nocreds");
    std::fs::create_dir_all(home.join(".claude-old")).unwrap();
    let accounts = discover_accounts(&home, None, &[]);
    assert_eq!(ids(&accounts), vec!["claude"]);
}

#[test]
fn configured_claude_prefix_without_dot_keeps_full_label() {
    let home = temp_home("configured-label");
    let extra = home.join("srv").join("claude-work");
    login(&extra, None);
    let accounts = discover_accounts(&home, None, std::slice::from_ref(&extra));
    assert_eq!(accounts[1].id, "claude@claude-work");
    assert_eq!(accounts[1].label, "claude-work");
    let mut plugins = vec![claude_plugin()];
    apply_accounts(&mut plugins, &accounts);
    assert_eq!(plugins[1].manifest.name, "Claude · claude-work");
}

#[test]
fn missing_or_malformed_account_file_falls_back_to_dir_name() {
    let home = temp_home("fallback");
    login(&home.join(".claude-b"), None);
    login(&home.join(".claude-c"), None);
    std::fs::write(home.join(".claude-c").join(".claude.json"), "{not json").unwrap();
    let accounts = discover_accounts(&home, None, &[]);
    assert_eq!(
        ids(&accounts),
        vec!["claude", "claude@claude-b", "claude@claude-c"]
    );
    assert_eq!(accounts[1].label, "b");
    assert_eq!(accounts[1].email, None);
}

#[test]
fn duplicate_uuid_keeps_first() {
    let home = temp_home("dedupe");
    login(&home.join(".claude"), None);
    write_account(&home.join(".claude.json"), "1234abcd-5678", "a@example.com");
    login(
        &home.join(".claude-b"),
        Some(("1234abcd-5678", "a@example.com")),
    );
    login(
        &home.join(".claude-c"),
        Some(("9999eeee-0000", "c@example.com")),
    );
    let extra = home.join(".claude-c");
    let accounts = discover_accounts(&home, None, &[extra]);
    assert_eq!(ids(&accounts), vec!["claude", "claude@9999eeee"]);
}

#[test]
fn primary_uses_claude_config_dir_and_its_account_file() {
    let home = temp_home("envprimary");
    let primary = home.join("custom");
    login(&primary, Some(("5555ffff-1", "env@example.com")));
    write_account(&home.join(".claude.json"), "0000aaaa-1", "home@example.com");
    login(&home.join(".claude-b"), None);
    let accounts = discover_accounts(
        &home,
        Some(primary.to_str().unwrap()),
        std::slice::from_ref(&primary),
    );
    assert_eq!(ids(&accounts), vec!["claude", "claude@claude-b"]);
    assert_eq!(accounts[0].email.as_deref(), Some("env@example.com"));
    assert_eq!(accounts[1].label, "b");
}

fn claude_plugin() -> LoadedPlugin {
    LoadedPlugin {
        manifest: PluginManifest {
            schema_version: 1,
            id: "claude".to_string(),
            name: "Claude".to_string(),
            version: "0.0.0".to_string(),
            entry: "plugin.js".to_string(),
            icon: "icon.svg".to_string(),
            brand_color: None,
            lines: vec![],
            links: vec![],
            window_starter_raw: None,
        },
        plugin_dir: PathBuf::from("."),
        entry_script: String::new(),
        icon_data_url: String::new(),
        window_starter: None,
        base_id: "claude".to_string(),
        env_overrides: vec![],
        account_email: None,
    }
}

#[test]
fn apply_single_account_keeps_name() {
    let mut plugins = vec![claude_plugin()];
    let home = temp_home("apply-single");
    apply_accounts(&mut plugins, &discover_accounts(&home, None, &[]));
    assert_eq!(plugins.len(), 1);
    assert_eq!(plugins[0].manifest.name, "Claude");
}

#[test]
fn apply_instances_labels_and_env() {
    let mut plugins = vec![claude_plugin()];
    let home = temp_home("apply-multi");
    login(
        &home.join(".claude-b"),
        Some(("1234abcd-5678", "work@example.com")),
    );
    apply_accounts(&mut plugins, &discover_accounts(&home, None, &[]));
    assert_eq!(plugins.len(), 2);
    assert_eq!(plugins[0].manifest.name, "Claude");
    assert!(plugins[0].env_overrides.is_empty());
    assert_eq!(plugins[1].manifest.id, "claude@1234abcd");
    assert_eq!(plugins[1].manifest.name, "Claude · b");
    assert_eq!(plugins[1].account_email.as_deref(), Some("work@example.com"));
    assert_eq!(plugins[1].base_id, "claude");
    assert_eq!(
        plugins[1].env_overrides,
        vec![(
            "CLAUDE_CONFIG_DIR".to_string(),
            home.join(".claude-b").to_string_lossy().to_string()
        )]
    );
}
