import {
  DEFAULT_AUTO_UPDATE_INTERVAL,
  DEFAULT_CROSSING_GO_REMAINING_MINUTES,
  DEFAULT_DISPLAY_MODE,
  DEFAULT_LEFTOVER_NOTIFY_ENABLED,
  DEFAULT_GLOBAL_SHORTCUT,
  DEFAULT_RESET_TIMER_DISPLAY_MODE,
  DEFAULT_START_ON_LOGIN,
  DEFAULT_THEME_MODE,
  DEFAULT_TIMELINE_CARD_ROWS,
  DEFAULT_TIMELINE_CARD_VISIBLE,
  DEFAULT_WINDOW_STARTER_ENABLED,
  type AutoUpdateIntervalMinutes,
  type CrossingGoRemainingMinutes,
  type DisplayMode,
  type GlobalShortcut,
  type ResetTimerDisplayMode,
  type ThemeMode,
  type TimelineCardRowId,
} from "@/lib/settings";

class AppPreferencesController {
  autoUpdateInterval = $state<AutoUpdateIntervalMinutes>(DEFAULT_AUTO_UPDATE_INTERVAL);
  themeMode = $state<ThemeMode>(DEFAULT_THEME_MODE);
  displayMode = $state<DisplayMode>(DEFAULT_DISPLAY_MODE);
  resetTimerDisplayMode = $state<ResetTimerDisplayMode>(DEFAULT_RESET_TIMER_DISPLAY_MODE);
  crossingGoRemainingMinutes = $state<CrossingGoRemainingMinutes>(
    DEFAULT_CROSSING_GO_REMAINING_MINUTES,
  );
  leftoverNotifyEnabled = $state(DEFAULT_LEFTOVER_NOTIFY_ENABLED);
  globalShortcut = $state<GlobalShortcut>(DEFAULT_GLOBAL_SHORTCUT);
  startOnLogin = $state(DEFAULT_START_ON_LOGIN);
  windowStarterEnabled = $state(DEFAULT_WINDOW_STARTER_ENABLED);
  timelineCardVisible = $state(DEFAULT_TIMELINE_CARD_VISIBLE);
  timelineCardRows = $state<TimelineCardRowId[]>([...DEFAULT_TIMELINE_CARD_ROWS]);

  setAutoUpdateInterval(value: AutoUpdateIntervalMinutes): void {
    this.autoUpdateInterval = value;
  }

  setThemeMode(value: ThemeMode): void {
    this.themeMode = value;
  }

  setDisplayMode(value: DisplayMode): void {
    this.displayMode = value;
  }

  setResetTimerDisplayMode(value: ResetTimerDisplayMode): void {
    this.resetTimerDisplayMode = value;
  }

  setCrossingGoRemainingMinutes(value: CrossingGoRemainingMinutes): void {
    this.crossingGoRemainingMinutes = value;
  }

  setLeftoverNotifyEnabled(value: boolean): void {
    this.leftoverNotifyEnabled = value;
  }

  setGlobalShortcut(value: GlobalShortcut): void {
    this.globalShortcut = value;
  }

  setStartOnLogin(value: boolean): void {
    this.startOnLogin = value;
  }

  setWindowStarterEnabled(value: boolean): void {
    this.windowStarterEnabled = value;
  }

  setTimelineCardVisible(value: boolean): void {
    this.timelineCardVisible = value;
  }

  setTimelineCardRows(value: TimelineCardRowId[]): void {
    this.timelineCardRows = value;
  }

  resetState(): void {
    this.autoUpdateInterval = DEFAULT_AUTO_UPDATE_INTERVAL;
    this.themeMode = DEFAULT_THEME_MODE;
    this.displayMode = DEFAULT_DISPLAY_MODE;
    this.resetTimerDisplayMode = DEFAULT_RESET_TIMER_DISPLAY_MODE;
    this.crossingGoRemainingMinutes = DEFAULT_CROSSING_GO_REMAINING_MINUTES;
    this.leftoverNotifyEnabled = DEFAULT_LEFTOVER_NOTIFY_ENABLED;
    this.globalShortcut = DEFAULT_GLOBAL_SHORTCUT;
    this.startOnLogin = DEFAULT_START_ON_LOGIN;
    this.windowStarterEnabled = DEFAULT_WINDOW_STARTER_ENABLED;
    this.timelineCardVisible = DEFAULT_TIMELINE_CARD_VISIBLE;
    this.timelineCardRows = [...DEFAULT_TIMELINE_CARD_ROWS];
  }
}

export const appPreferencesController = new AppPreferencesController();
