import { listenTrayNavigate, listenTrayShowAbout, type UnlistenFn } from "../lib/backend";
import { customizePluginId, isCustomizeTimeline, type Screen } from "./app-ui-controller.svelte";

export type ShellKeyAction = "back" | "advance" | "toggle-settings" | "refresh";

/**
 * Shell-level key handling (Esc back, Enter advance, Ctrl+, settings,
 * Ctrl+R refresh). While a dialog is open the shell does nothing — dialogs
 * (About/changelog) consume Escape in their own handlers.
 */
export function resolveShellKeyAction(
  event: KeyboardEvent,
  isDialogOpen: boolean,
): ShellKeyAction | null {
  if (event.defaultPrevented) return null;
  if (isEditableTarget(event.target)) return null;
  if (isDialogOpen) return null;

  if ((event.ctrlKey || event.metaKey) && !event.altKey && !event.shiftKey) {
    if (event.key === ",") return "toggle-settings";
    if (event.key === "r" || event.key === "R") return "refresh";
    return null;
  }
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return null;

  if (event.key === "Escape") return "back";
  if (event.key === "Enter") return "advance";
  return null;
}

/** One step toward the parent root tab. Root tabs stay put. */
export function backScreen(screen: Screen): Screen {
  if (customizePluginId(screen)) return "customize";
  if (isCustomizeTimeline(screen)) return "timeline";
  if (screen === "customize") return "settings";
  return screen;
}

/** Dashboard advances into Customize; nested screens step back; root tabs stay. */
export function advanceScreen(screen: Screen): Screen {
  if (screen === "dashboard") return "customize";
  return backScreen(screen);
}

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;

  if (target.isContentEditable) return true;
  if (target.closest("input, textarea, select, [contenteditable='true'], [role='textbox']")) {
    return true;
  }

  return false;
}

export function hasScrollableContent(el: HTMLElement | null): boolean {
  if (!el) return false;
  return el.scrollHeight - el.scrollTop - el.clientHeight > 1;
}

class PanelController {
  canScrollDown = $state(false);

  private unlisteners: UnlistenFn[] = [];

  async attachTrayEvents(handlers: {
    onNavigate: (payload: string) => void;
    onShowAbout: () => void;
  }): Promise<void> {
    const navigateUnlisten = await listenTrayNavigate(handlers.onNavigate);
    const showAboutUnlisten = await listenTrayShowAbout(handlers.onShowAbout);
    this.unlisteners.push(navigateUnlisten, showAboutUnlisten);
  }

  updateScrollState(el: HTMLElement | null): void {
    this.canScrollDown = hasScrollableContent(el);
  }

  dispose(): void {
    for (const unlisten of this.unlisteners) unlisten();
    this.unlisteners = [];
  }
}

export const panelController = new PanelController();
