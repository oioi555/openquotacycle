use std::sync::Mutex;

use gtk::glib::object::Cast;
use gtk::prelude::{GtkWindowExt, WidgetExt};
use tauri::{AppHandle, Manager, PhysicalPosition, Runtime, WebviewWindow};

fn get_main_window(app_handle: &AppHandle) -> Option<WebviewWindow> {
    let window = app_handle.get_webview_window("main");
    if window.is_none() {
        log::error!("main window not found");
    }
    window
}

static REMEMBERED_POSITION: Mutex<Option<(i32, i32)>> = Mutex::new(None);

fn store_remembered_position(is_maximized: bool, outer: Option<(i32, i32)>) {
    let position = if is_maximized { None } else { outer };
    if let Ok(mut remembered) = REMEMBERED_POSITION.lock() {
        *remembered = position;
    }
}

pub fn remember_window_position<R: Runtime>(window: &tauri::Window<R>) {
    store_remembered_position(
        window.is_maximized().unwrap_or(false),
        window.outer_position().ok().map(|p| (p.x, p.y)),
    );
}

fn remember_window_position_of(window: &WebviewWindow) {
    store_remembered_position(
        window.is_maximized().unwrap_or(false),
        window.outer_position().ok().map(|p| (p.x, p.y)),
    );
}

pub(crate) fn should_withdraw(visible: bool, minimized: bool, focused: bool) -> bool {
    visible && !minimized && focused
}

fn remembered_position() -> Option<(i32, i32)> {
    REMEMBERED_POSITION.lock().ok().and_then(|p| *p)
}

fn x11_server_time(gtk_window: &gtk::ApplicationWindow) -> Option<u32> {
    let gdk_window = gtk_window.window()?;
    let x11_window = gdk_window.downcast::<gdkx11::X11Window>().ok()?;
    Some(gdkx11::functions::x11_get_server_time(&x11_window))
}

fn present_window(gtk_window: &gtk::ApplicationWindow, token: Option<&str>) {
    if let Some(token) = token {
        gtk_window.set_startup_id(token);
    }
    match x11_server_time(gtk_window) {
        Some(timestamp) => gtk_window.present_with_time(timestamp),
        None => gtk_window.present(),
    }
}

fn raise_window(window: &WebviewWindow, token: Option<String>) {
    let window = window.clone();
    if let Err(error) = window.clone().run_on_main_thread(move || {
        if let (Some(token), Ok(gtk_window)) = (token.as_ref(), window.gtk_window()) {
            gtk_window.set_startup_id(token);
        }
        let window = window.clone();
        gtk::glib::idle_add_local_once(move || match window.gtk_window() {
            Ok(gtk_window) => present_window(&gtk_window, token.as_deref()),
            Err(error) => log::warn!("show_panel: gtk_window unavailable: {error}"),
        });
    }) {
        log::warn!("show_panel: failed to hop to GTK thread: {error}");
    }
}

pub fn show_panel_with_activation(app_handle: &AppHandle, token: Option<String>) {
    let Some(window) = get_main_window(app_handle) else {
        return;
    };

    if let Ok(true) = window.is_minimized() {
        if let Err(error) = window.unminimize() {
            log::warn!("show_panel: failed to unminimize window: {error}");
        }
    }

    if let Err(error) = window.show() {
        log::warn!("show_panel: failed to show window: {error}");
    } else if let Some((x, y)) = remembered_position() {
        // KWin re-places a window that was unmapped by hide(), so pin it back.
        if let Err(error) = window.set_position(PhysicalPosition::new(x, y)) {
            log::warn!("show_panel: failed to restore window position: {error}");
        }
    }

    raise_window(&window, token);
}

pub fn toggle_panel(app_handle: &AppHandle) {
    toggle_panel_with_activation(app_handle, None);
}

pub fn toggle_panel_with_activation(app_handle: &AppHandle, token: Option<String>) {
    let Some(window) = get_main_window(app_handle) else {
        return;
    };

    let visible = window.is_visible().unwrap_or(false);
    let minimized = window.is_minimized().unwrap_or(false);
    let focused = window.is_focused().unwrap_or(false);
    if should_withdraw(visible, minimized, focused) {
        remember_window_position_of(&window);
        if let Err(error) = window.hide() {
            log::warn!("toggle_panel: failed to hide window: {error}");
        }
        return;
    }

    show_panel_with_activation(app_handle, token);
}

#[cfg(test)]
mod tests {
    use super::should_withdraw;

    #[test]
    fn withdraw_only_when_visible_unminimized_and_focused() {
        assert!(should_withdraw(true, false, true));
        assert!(!should_withdraw(true, false, false));
        assert!(!should_withdraw(true, true, true));
        assert!(!should_withdraw(false, false, false));
        assert!(!should_withdraw(false, false, true));
    }
}
