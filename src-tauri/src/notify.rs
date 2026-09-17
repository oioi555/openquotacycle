//! Desktop notifications via org.freedesktop.Notifications.

use std::path::Path;

use tauri::path::BaseDirectory;
use tauri::{AppHandle, Manager};

const APP_NAME: &str = "OpenQuotaCycle";
/// Freedesktop: 0 = do not expire until the user dismisses.
const EXPIRE_TIMEOUT_MS: i32 = 0;

#[tauri::command]
pub async fn show_desktop_notification(
    app: AppHandle,
    title: String,
    body: String,
) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        linux::show(&app, &title, &body).await
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (app, title, body);
        Ok(())
    }
}

pub(crate) fn app_icon_arg(icon_path: Option<&Path>) -> String {
    icon_path
        .filter(|path| path.is_file())
        .map(|path| path.to_string_lossy().into_owned())
        .unwrap_or_default()
}

fn resolve_notify_icon(app: &AppHandle) -> String {
    let path = app
        .path()
        .resolve("icons/icon.png", BaseDirectory::Resource)
        .ok();
    app_icon_arg(path.as_deref())
}

#[cfg(target_os = "linux")]
mod linux {
    use std::collections::HashMap;
    use zbus::proxy;
    use zbus::zvariant::Value;

    use super::{APP_NAME, EXPIRE_TIMEOUT_MS, resolve_notify_icon};

    #[proxy(
        interface = "org.freedesktop.Notifications",
        default_service = "org.freedesktop.Notifications",
        default_path = "/org/freedesktop/Notifications"
    )]
    trait Notifications {
        fn notify(
            &self,
            app_name: &str,
            replaces_id: u32,
            app_icon: &str,
            summary: &str,
            body: &str,
            actions: &[&str],
            hints: HashMap<&str, Value<'_>>,
            expire_timeout: i32,
        ) -> zbus::Result<u32>;
    }

    pub async fn show(app: &tauri::AppHandle, title: &str, body: &str) -> Result<(), String> {
        let icon = resolve_notify_icon(app);
        let desktop_entry = app.config().identifier.clone();
        let connection = zbus::Connection::session()
            .await
            .map_err(|error| error.to_string())?;
        let proxy = NotificationsProxy::new(&connection)
            .await
            .map_err(|error| error.to_string())?;
        let mut hints = HashMap::<&str, Value<'_>>::new();
        hints.insert("desktop-entry", Value::from(desktop_entry.as_str()));
        hints.insert("urgency", Value::from(1_u8));
        proxy
            .notify(
                APP_NAME,
                0,
                &icon,
                title,
                body,
                &[],
                hints,
                EXPIRE_TIMEOUT_MS,
            )
            .await
            .map_err(|error| error.to_string())?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::{EXPIRE_TIMEOUT_MS, app_icon_arg};
    use std::path::Path;

    #[test]
    fn missing_icon_is_empty_not_desktop_id() {
        assert_eq!(app_icon_arg(None), "");
        assert_eq!(
            app_icon_arg(Some(Path::new("/no/such/openquotacycle-notify-icon.png"))),
            ""
        );
    }

    #[test]
    fn existing_icon_file_is_passed_as_path() {
        let path = std::env::temp_dir().join("openquotacycle-notify-icon-test.png");
        std::fs::write(&path, b"png").expect("write temp icon");
        assert_eq!(app_icon_arg(Some(&path)), path.to_string_lossy());
        let _ = std::fs::remove_file(&path);
    }

    #[test]
    fn expire_timeout_stays_until_dismissed() {
        assert_eq!(EXPIRE_TIMEOUT_MS, 0);
    }
}
