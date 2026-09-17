//! One-shot copy of Quotracker user data and XDG config into OpenQuotaCycle paths.
//! Failures log and never abort startup. Destination presence is the idempotency check.

use std::fs;
use std::io;
use std::path::Path;

/// Previous Tauri identifier. Copied from, never deleted.
pub const LEGACY_APP_ID: &str = "io.github.oioi555.quotracker";
const LEGACY_CONFIG_DIRNAME: &str = "quotracker";
const NEW_CONFIG_DIRNAME: &str = "openquotacycle";

pub fn migrate_xdg_config_from_dirs() {
    let Some(config_home) = dirs::config_dir() else {
        return;
    };
    migrate_xdg_config(
        &config_home.join(LEGACY_CONFIG_DIRNAME),
        &config_home.join(NEW_CONFIG_DIRNAME),
    );
}

pub fn migrate_app_data_from_new_dir(new_app_data_dir: &Path) {
    let Some(parent) = new_app_data_dir.parent() else {
        return;
    };
    migrate_app_data(&parent.join(LEGACY_APP_ID), new_app_data_dir);
}

pub fn migrate_app_data(legacy_dir: &Path, new_dir: &Path) {
    if new_dir.join("settings.json").is_file() {
        return;
    }
    if !legacy_dir.exists() {
        return;
    }
    match copy_dir_skip_logs(legacy_dir, new_dir) {
        Ok(()) => log::info!(
            "migrated app data from {} to {}",
            legacy_dir.display(),
            new_dir.display()
        ),
        Err(error) => log::warn!(
            "legacy app data migration from {} failed: {}; continuing with defaults",
            legacy_dir.display(),
            error
        ),
    }
}

pub fn migrate_xdg_config(legacy_dir: &Path, new_dir: &Path) {
    if new_dir.exists() {
        return;
    }
    if !legacy_dir.exists() {
        return;
    }
    match copy_dir_all(legacy_dir, new_dir) {
        Ok(()) => log::info!(
            "migrated config from {} to {}",
            legacy_dir.display(),
            new_dir.display()
        ),
        Err(error) => log::warn!(
            "legacy config migration from {} failed: {}; continuing with defaults",
            legacy_dir.display(),
            error
        ),
    }
}

fn copy_dir_skip_logs(src: &Path, dst: &Path) -> io::Result<()> {
    copy_tree(src, dst, true)
}

fn copy_dir_all(src: &Path, dst: &Path) -> io::Result<()> {
    copy_tree(src, dst, false)
}

fn copy_tree(src: &Path, dst: &Path, skip_logs: bool) -> io::Result<()> {
    fs::create_dir_all(dst)?;
    let entries = match fs::read_dir(src) {
        Ok(entries) => entries,
        Err(error) => return Err(error),
    };
    for entry in entries {
        let entry = entry?;
        let name = entry.file_name();
        if skip_logs && name == "logs" {
            continue;
        }
        let dest_path = dst.join(&name);
        let file_type = entry.file_type()?;
        if file_type.is_dir() {
            copy_tree(&entry.path(), &dest_path, skip_logs)?;
        } else if file_type.is_file() {
            if skip_logs {
                let name = name.to_string_lossy();
                if name.ends_with(".log") || name.contains(".log.") {
                    continue;
                }
            }
            fs::copy(entry.path(), dest_path)?;
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn temp_root(label: &str) -> std::path::PathBuf {
        let nanos = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_nanos();
        let dir = std::env::temp_dir().join(format!(
            "openquotacycle-mig-{}-{}-{}",
            label,
            std::process::id(),
            nanos
        ));
        fs::create_dir_all(&dir).unwrap();
        dir
    }

    #[test]
    fn copies_settings_and_skips_logs() {
        let root = temp_root("happy");
        let legacy = root.join("legacy");
        let next = root.join("new");
        fs::create_dir_all(legacy.join("logs")).unwrap();
        fs::write(legacy.join("settings.json"), "{\"theme\":\"dark\"}").unwrap();
        fs::write(legacy.join("window-state.json"), "{}").unwrap();
        fs::write(legacy.join("logs").join("app.log"), "secret").unwrap();
        fs::write(legacy.join("app.log"), "also-secret").unwrap();

        migrate_app_data(&legacy, &next);

        assert_eq!(
            fs::read_to_string(next.join("settings.json")).unwrap(),
            "{\"theme\":\"dark\"}"
        );
        assert!(next.join("window-state.json").is_file());
        assert!(!next.join("logs").exists());
        assert!(!next.join("app.log").exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn skips_when_new_settings_exist() {
        let root = temp_root("skip");
        let legacy = root.join("legacy");
        let next = root.join("new");
        fs::create_dir_all(&legacy).unwrap();
        fs::create_dir_all(&next).unwrap();
        fs::write(legacy.join("settings.json"), "old").unwrap();
        fs::write(next.join("settings.json"), "kept").unwrap();

        migrate_app_data(&legacy, &next);

        assert_eq!(fs::read_to_string(next.join("settings.json")).unwrap(), "kept");
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn no_legacy_is_noop() {
        let root = temp_root("none");
        let next = root.join("new");
        migrate_app_data(&root.join("missing"), &next);
        assert!(!next.exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn unreadable_legacy_is_not_fatal() {
        let root = temp_root("unread");
        let legacy = root.join("legacy");
        let next = root.join("new");
        // A file where a directory is expected makes read_dir fail.
        fs::write(&legacy, "not-a-dir").unwrap();
        migrate_app_data(&legacy, &next);
        assert!(!next.join("settings.json").exists());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn copies_xdg_config_when_dest_missing() {
        let root = temp_root("cfg");
        let legacy = root.join("quotracker");
        let next = root.join("openquotacycle");
        fs::create_dir_all(&legacy).unwrap();
        fs::write(legacy.join("config.json"), "{\"proxy\":null}").unwrap();
        fs::write(legacy.join("openrouter.json"), "{\"apiKey\":\"k\"}").unwrap();

        migrate_xdg_config(&legacy, &next);

        assert_eq!(
            fs::read_to_string(next.join("config.json")).unwrap(),
            "{\"proxy\":null}"
        );
        assert!(next.join("openrouter.json").is_file());
        let _ = fs::remove_dir_all(root);
    }

    #[test]
    fn skips_xdg_config_when_dest_exists() {
        let root = temp_root("cfgskip");
        let legacy = root.join("quotracker");
        let next = root.join("openquotacycle");
        fs::create_dir_all(&legacy).unwrap();
        fs::create_dir_all(&next).unwrap();
        fs::write(legacy.join("config.json"), "old").unwrap();
        fs::write(next.join("config.json"), "kept").unwrap();

        migrate_xdg_config(&legacy, &next);

        assert_eq!(fs::read_to_string(next.join("config.json")).unwrap(), "kept");
        let _ = fs::remove_dir_all(root);
    }
}
