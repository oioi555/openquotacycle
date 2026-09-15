// Screen-stack navigation: Overview / Timeline / Settings are root tabs.
// Nested screens step back toward their parent tab. Ranks drive slide direction.
export const FIXED_SCREENS = [
  "dashboard",
  "timeline",
  "customize",
  "settings",
] as const;

export type FixedScreen = (typeof FIXED_SCREENS)[number];
export type Screen = FixedScreen | `customize:${string}`;

/** Customize L2 id. Distinct from the Timeline page screen `"timeline"`. */
export const CUSTOMIZE_TIMELINE_ID = "timeline";
export const CUSTOMIZE_TIMELINE_SCREEN = `customize:${CUSTOMIZE_TIMELINE_ID}` as const;

export type RootTab = "dashboard" | "timeline" | "settings";

const SCREEN_RANK: Record<string, number> = {
  dashboard: 0,
  timeline: 1,
  [CUSTOMIZE_TIMELINE_SCREEN]: 2,
  settings: 3,
  customize: 4,
};

export function screenRank(screen: Screen): number {
  if (screen === CUSTOMIZE_TIMELINE_SCREEN) return SCREEN_RANK[CUSTOMIZE_TIMELINE_SCREEN];
  if (screen.startsWith("customize:")) return 6;
  return SCREEN_RANK[screen] ?? 0;
}

export function isRootScreen(screen: Screen): boolean {
  return screen === "dashboard" || screen === "timeline" || screen === "settings";
}

export function rootTab(screen: Screen): RootTab {
  if (screen === "dashboard") return "dashboard";
  if (screen === "timeline" || screen === CUSTOMIZE_TIMELINE_SCREEN) return "timeline";
  return "settings";
}

/** Plugin id of a `customize:<pluginId>` screen, else null.
 * The reserved Timeline customize id is not a plugin. */
export function customizePluginId(screen: Screen): string | null {
  if (!screen.startsWith("customize:")) return null;
  const id = screen.slice("customize:".length);
  if (id === CUSTOMIZE_TIMELINE_ID) return null;
  return id;
}

export function isCustomizeTimeline(screen: Screen): boolean {
  return screen === CUSTOMIZE_TIMELINE_SCREEN;
}

/** Map a tray:navigate payload onto a screen. */
export function trayPayloadToScreen(payload: string): Screen {
  if (payload === "settings") return "settings";
  if (payload === "timeline") return "timeline";
  return "dashboard";
}

class AppUiController {
  screen = $state<Screen>("dashboard");
  showAbout = $state(false);
  showResetAllCustomization = $state(false);
  /** Slide direction of the last navigation (1 = deeper, -1 = back). */
  lastDirection = $state(1);
  /** Return target for Settings (Ctrl+, and the Settings tab both record it). */
  preSettingsScreen: Screen = "dashboard";
  /** Dashboard provider cards expanded this session (survives screen switches). */
  expandedPluginIds = $state<ReadonlySet<string>>(new Set<string>());

  setScreen(screen: Screen): void {
    this.lastDirection = Math.sign(screenRank(screen) - screenRank(this.screen)) || 1;
    this.screen = screen;
  }

  /** Record the current screen as the Settings return target. No-op while
   * already on Settings so chained entries keep the first origin. */
  noteSettingsOrigin(): void {
    if (this.screen !== "settings") this.preSettingsScreen = this.screen;
  }

  toggleSettings(): void {
    if (this.screen === "settings") {
      this.setScreen(this.preSettingsScreen);
      return;
    }
    this.noteSettingsOrigin();
    this.setScreen("settings");
  }

  /** Jump to a root tab. Nested screens collapse to that tab's root. */
  selectRootTab(tab: RootTab): void {
    if (tab === this.screen) return;
    if (tab === "settings") this.noteSettingsOrigin();
    this.setScreen(tab);
  }

  setShowAbout(value: boolean): void {
    this.showAbout = value;
  }

  setShowResetAllCustomization(value: boolean): void {
    this.showResetAllCustomization = value;
  }

  togglePluginExpanded(pluginId: string): void {
    const next = new Set(this.expandedPluginIds);
    if (next.has(pluginId)) {
      next.delete(pluginId);
    } else {
      next.add(pluginId);
    }
    this.expandedPluginIds = next;
  }

  resetState(): void {
    this.screen = "dashboard";
    this.showAbout = false;
    this.showResetAllCustomization = false;
    this.lastDirection = 1;
    this.preSettingsScreen = "dashboard";
    this.expandedPluginIds = new Set<string>();
  }
}

export const appUiController = new AppUiController();
