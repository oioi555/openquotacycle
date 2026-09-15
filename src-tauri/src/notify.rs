//! Desktop notifications via org.freedesktop.Notifications.

#[tauri::command]
pub async fn show_desktop_notification(title: String, body: String) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        linux::show(&title, &body).await
    }
    #[cfg(not(target_os = "linux"))]
    {
        let _ = (title, body);
        Ok(())
    }
}

#[cfg(target_os = "linux")]
mod linux {
    use std::collections::HashMap;
    use zbus::proxy;
    use zbus::zvariant::Value;

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

    pub async fn show(title: &str, body: &str) -> Result<(), String> {
        let connection = zbus::Connection::session()
            .await
            .map_err(|error| error.to_string())?;
        let proxy = NotificationsProxy::new(&connection)
            .await
            .map_err(|error| error.to_string())?;
        let hints = HashMap::<&str, Value<'_>>::new();
        proxy
            .notify(
                "Quotracker",
                0,
                "io.github.oioi555.quotracker",
                title,
                body,
                &[],
                hints,
                8_000,
            )
            .await
            .map_err(|error| error.to_string())?;
        Ok(())
    }
}
