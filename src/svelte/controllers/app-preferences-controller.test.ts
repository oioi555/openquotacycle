import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_AUTO_UPDATE_INTERVAL,
  DEFAULT_THEME_MODE,
  DEFAULT_TIMELINE_CARD_ROWS,
  DEFAULT_TIMELINE_CARD_VISIBLE,
} from "@/lib/settings";
import { appPreferencesController } from "./app-preferences-controller.svelte";

describe("appPreferencesController", () => {
  beforeEach(() => {
    appPreferencesController.resetState();
  });

  it("starts with library defaults", () => {
    expect(appPreferencesController.autoUpdateInterval).toBe(DEFAULT_AUTO_UPDATE_INTERVAL);
    expect(appPreferencesController.themeMode).toBe(DEFAULT_THEME_MODE);
    expect(appPreferencesController.startOnLogin).toBe(false);
    expect(appPreferencesController.timelineCardVisible).toBe(DEFAULT_TIMELINE_CARD_VISIBLE);
    expect(appPreferencesController.timelineCardRows).toEqual(DEFAULT_TIMELINE_CARD_ROWS);
    expect(DEFAULT_TIMELINE_CARD_VISIBLE).toBe(true);
  });

  it("updates preference values", () => {
    appPreferencesController.setAutoUpdateInterval(15);
    appPreferencesController.setThemeMode("dark");
    appPreferencesController.setStartOnLogin(true);
    appPreferencesController.setWindowStarterEnabled(true);
    appPreferencesController.setTimelineCardVisible(false);
    appPreferencesController.setTimelineCardRows(["weekly"]);

    expect(appPreferencesController.autoUpdateInterval).toBe(15);
    expect(appPreferencesController.themeMode).toBe("dark");
    expect(appPreferencesController.startOnLogin).toBe(true);
    expect(appPreferencesController.windowStarterEnabled).toBe(true);
    expect(appPreferencesController.timelineCardVisible).toBe(false);
    expect(appPreferencesController.timelineCardRows).toEqual(["weekly"]);
  });

  it("resets to defaults", () => {
    appPreferencesController.setAutoUpdateInterval(15);
    appPreferencesController.setThemeMode("light");

    appPreferencesController.resetState();

    expect(appPreferencesController.autoUpdateInterval).toBe(DEFAULT_AUTO_UPDATE_INTERVAL);
    expect(appPreferencesController.themeMode).toBe(DEFAULT_THEME_MODE);
    expect(appPreferencesController.timelineCardVisible).toBe(DEFAULT_TIMELINE_CARD_VISIBLE);
    expect(appPreferencesController.timelineCardRows).toEqual(DEFAULT_TIMELINE_CARD_ROWS);
  });
});
