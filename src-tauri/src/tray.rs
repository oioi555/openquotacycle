use std::sync::Mutex;

use ksni::blocking::{Handle, TrayMethods};
use ksni::menu::{MenuItem, StandardItem};
use ksni::{Icon, ToolTip, Tray};
use tauri::image::Image;
use tauri::path::BaseDirectory;
use tauri::{AppHandle, Emitter, Manager};

use crate::panel;

static TRAY_HANDLE: Mutex<Option<Handle<QuoTray>>> = Mutex::new(None);

pub(crate) fn rgba_to_argb(mut data: Vec<u8>) -> Vec<u8> {
    for pixel in data.chunks_exact_mut(4) {
        pixel.rotate_right(1);
    }
    data
}

pub(crate) fn tooltip_from_text(text: &str) -> ToolTip {
    let mut lines = text.lines();
    let title = lines.next().unwrap_or("OpenQuotaCycle").to_string();
    let description = lines.collect::<Vec<_>>().join("\n");
    ToolTip {
        icon_name: String::new(),
        icon_pixmap: Vec::new(),
        title,
        description,
    }
}

fn load_app_icon(app_handle: &AppHandle) -> tauri::Result<Icon> {
    let tray_icon_path = app_handle
        .path()
        .resolve("icons/icon.png", BaseDirectory::Resource)?;
    let image = Image::from_path(&tray_icon_path)?;
    Ok(Icon {
        width: image.width() as i32,
        height: image.height() as i32,
        data: rgba_to_argb(image.rgba().to_vec()),
    })
}

struct QuoTray {
    app: AppHandle,
    icon: Icon,
    tooltip: String,
    activation_token: Option<String>,
}

impl QuoTray {
    fn take_activation_token(&mut self) -> Option<String> {
        self.activation_token.take()
    }

    fn show_window(&mut self) {
        let token = self.take_activation_token();
        panel::show_panel_with_activation(&self.app, token);
    }

    fn navigate(&mut self, screen: &'static str) {
        log::info!("tray menu: navigate to {screen}");
        self.show_window();
        let _ = self.app.emit("tray:navigate", screen);
    }

    fn item(label: &str, action: impl Fn(&mut Self) + Send + 'static) -> MenuItem<Self> {
        StandardItem {
            label: label.into(),
            activate: Box::new(action),
            ..Default::default()
        }
        .into()
    }
}

impl Tray for QuoTray {
    const MENU_ON_ACTIVATE: bool = false;

    fn id(&self) -> String {
        "openquotacycle".into()
    }

    fn title(&self) -> String {
        "OpenQuotaCycle".into()
    }

    fn icon_pixmap(&self) -> Vec<Icon> {
        vec![self.icon.clone()]
    }

    fn tool_tip(&self) -> ToolTip {
        tooltip_from_text(&self.tooltip)
    }

    fn provide_xdg_activation_token(&mut self, token: String) {
        log::debug!("tray xdg activation token received");
        self.activation_token = Some(token);
    }

    fn activate(&mut self, _x: i32, _y: i32) {
        log::debug!("tray click: toggling window");
        let token = self.take_activation_token();
        panel::toggle_panel_with_activation(&self.app, token);
    }

    fn menu(&self) -> Vec<MenuItem<Self>> {
        vec![
            Self::item("Overview", |tray| {
                tray.navigate("dashboard");
            }),
            Self::item("Timeline", |tray| {
                tray.navigate("timeline");
            }),
            Self::item("Settings", |tray| {
                tray.navigate("settings");
            }),
            MenuItem::Separator,
            Self::item("About OpenQuotaCycle", |tray| {
                log::info!("tray menu: about clicked");
                tray.show_window();
                let _ = tray.app.emit("tray:show-about", ());
            }),
            Self::item("Quit", |tray| {
                log::info!("quit requested via tray");
                tray.app.exit(0);
            }),
        ]
    }

    fn watcher_offline(&self, reason: ksni::OfflineReason) -> bool {
        log::warn!("status notifier watcher offline: {reason:?}");
        true
    }
}

pub fn create(app_handle: &AppHandle) -> tauri::Result<()> {
    let icon = load_app_icon(app_handle)?;
    log::set_max_level(if cfg!(debug_assertions) {
        log::LevelFilter::Trace
    } else {
        log::LevelFilter::Error
    });

    let tray = QuoTray {
        app: app_handle.clone(),
        icon,
        tooltip: "OpenQuotaCycle".into(),
        activation_token: None,
    };
    let handle = tray
        .assume_sni_available(true)
        .spawn()
        .map_err(|e| tauri::Error::from(std::io::Error::other(e.to_string())))?;

    match TRAY_HANDLE.lock() {
        Ok(mut slot) => *slot = Some(handle),
        Err(_) => {
            return Err(tauri::Error::from(std::io::Error::other(
                "tray handle mutex poisoned",
            )));
        }
    }

    Ok(())
}

#[tauri::command]
pub fn set_tray_tooltip(tooltip: String) -> Result<(), String> {
    let handle = TRAY_HANDLE
        .lock()
        .map_err(|e| format!("tray handle mutex poisoned: {e}"))?;
    let Some(handle) = handle.as_ref() else {
        return Err("tray is not ready".into());
    };
    if handle.update(|tray| tray.tooltip = tooltip).is_none() {
        return Err("tray service has shut down".into());
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::{rgba_to_argb, tooltip_from_text};

    #[test]
    fn rgba_to_argb_rotates_each_pixel() {
        assert_eq!(
            rgba_to_argb(vec![1, 2, 3, 4, 5, 6, 7, 8]),
            vec![4, 1, 2, 3, 8, 5, 6, 7]
        );
    }

    #[test]
    fn tooltip_splits_first_line_as_title() {
        let tip = tooltip_from_text("OpenQuotaCycle\nClaude: 12%\nCodex: --%");
        assert_eq!(tip.title, "OpenQuotaCycle");
        assert_eq!(tip.description, "Claude: 12%\nCodex: --%");
    }
}
