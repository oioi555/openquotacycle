import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SettingsPage from "./settings.svelte";
import { appUiController } from "../controllers/app-ui-controller.svelte";

const onAutoUpdateIntervalChange = vi.fn();
const onThemeModeChange = vi.fn();
const onDisplayModeChange = vi.fn();
const onResetTimerDisplayModeChange = vi.fn();
const onCrossingGoRemainingMinutesChange = vi.fn();
const onLeftoverNotifyEnabledChange = vi.fn();
const onStartOnLoginChange = vi.fn();

function setup() {
  render(SettingsPage, {
    props: {
      version: "0.0.2",
      autoUpdateInterval: 5,
      onAutoUpdateIntervalChange,
      themeMode: "system",
      onThemeModeChange,
      displayMode: "left",
      onDisplayModeChange,
      resetTimerDisplayMode: "relative",
      onResetTimerDisplayModeChange,
      crossingGoRemainingMinutes: 60,
      onCrossingGoRemainingMinutesChange,
      leftoverNotifyEnabled: true,
      onLeftoverNotifyEnabledChange,
      globalShortcut: null,
      onGlobalShortcutChange: vi.fn(),
      startOnLogin: false,
      onStartOnLoginChange,
    },
  });
}

describe("settings page", () => {
  beforeEach(() => {
    appUiController.resetState();
    vi.clearAllMocks();
  });

  it("links to Customize from the bottom row", async () => {
    appUiController.setScreen("settings");
    setup();

    const row = screen.getByText("Customize").closest("button");
    expect(row?.className).toContain("ui-nav-row");
    expect(row?.className).toContain("ui-pressable");
    expect(row?.querySelectorAll("svg")).toHaveLength(2);
    expect(screen.getByText("Choose what's visible and where")).toBeTruthy();

    await fireEvent.click(screen.getByText("Choose what's visible and where"));
    expect(appUiController.screen).toBe("customize");
  });

  it("does not link to Window Starter", () => {
    appUiController.setScreen("settings");
    setup();

    expect(screen.queryByText("Window Starter")).toBeNull();
    expect(screen.queryByText("Start idle 5-hour windows")).toBeNull();
  });

  it("opens About from the version row", async () => {
    setup();

    const row = screen.getByText("Quotracker").closest("button");
    expect(row?.className).toContain("ui-nav-row");
    expect(screen.getByText("v0.0.2 · Changelog & credits")).toBeTruthy();
    expect(screen.queryByText("Help")).toBeNull();

    await fireEvent.click(screen.getByText("v0.0.2 · Changelog & credits"));
    expect(appUiController.showAbout).toBe(true);
  });

  it("groups compact rows and drops witty subtitles", () => {
    setup();

    expect(screen.queryByText("How obsessive are you")).toBeNull();
    expect(screen.queryByText("Glass half full or half empty")).toBeNull();
    expect(screen.queryByText("Countdown or clock time")).toBeNull();
    expect(screen.queryByText("How it looks around here")).toBeNull();
    expect(screen.queryByText("Quotracker starts when you sign in")).toBeNull();
    expect(screen.queryByText("Starts when you sign in.")).toBeNull();
    expect(screen.queryByText("5h 12m")).toBeNull();
    expect(screen.queryByRole("radio")).toBeNull();

    for (const title of ["General", "Appearance", "Usage Display", "5-hour leftover"]) {
      const heading = screen.getByRole("heading", { name: title });
      expect(heading.tagName).toBe("H3");
      expect(heading.className).toContain("text-xs");
      expect(heading.className).toContain("font-medium");
      expect(heading.className).toContain("uppercase");
      expect(heading.className).toContain("text-muted-foreground");
      expect(heading.closest(".ui-list")).toBeNull();
      expect(heading.closest(".ui-card")).toBeNull();
    }

    expect(screen.getByText("Start on Login").closest(".ui-list")).not.toBeNull();
    expect(screen.getByText("Start on Login").closest(".ui-list")?.className).not.toContain(
      "ui-pressable",
    );
    expect(screen.getByText("Auto Refresh").closest(".ui-list")).not.toBeNull();
    expect(screen.getByText("Theme").closest(".ui-list")).not.toBeNull();
    expect(screen.getByText("Show Usage As").closest(".ui-list")).not.toBeNull();
    expect(screen.getByText("Reset Times").closest(".ui-list")).not.toBeNull();
    expect(screen.getByText("From").closest(".ui-list")).not.toBeNull();
    expect(screen.getByText("Notify").closest(".ui-list")).not.toBeNull();
    expect(screen.getByText("Show Usage As").closest(".ui-list")).not.toBe(
      screen.getByText("From").closest(".ui-list"),
    );
    expect(screen.queryByText("Cross reset")).toBeNull();
    expect(screen.queryByText("Melting leftover")).toBeNull();
    expect(screen.getByRole("heading", { name: "5-hour leftover" })).toBeTruthy();
    expect(screen.getByText("Global Shortcut").closest("li")).not.toBeNull();
  });

  it("uses a switch for start on login", () => {
    setup();

    expect(screen.getByRole("switch", { name: "Start on login" })).toBeTruthy();
    expect(screen.getByRole("switch", { name: "Notify 5-hour leftover" })).toBeTruthy();
    expect(screen.queryByRole("checkbox")).toBeNull();
    expect(screen.getByRole("switch", { name: "Start on login" }).className).not.toContain(
      "ui-pressable",
    );
  });

  it("picks options from compact menus instead of filled segments", async () => {
    setup();

    expect(screen.getByLabelText("Auto-update interval").className).toContain("ui-pressable");
    expect(screen.getByLabelText("Theme mode").className).toContain("ui-pressable");
    expect(screen.getByLabelText("Usage display mode").className).toContain("ui-pressable");
    expect(screen.getByLabelText("Reset timer display mode").className).toContain("ui-pressable");
    expect(screen.getByLabelText("5-hour leftover from").className).toContain("ui-pressable");
    expect(screen.getByLabelText("Auto-update interval")).toHaveTextContent("5 min");
    expect(screen.getByLabelText("Theme mode").className).not.toContain("bg-meter-fill");
    expect(screen.getByLabelText("Usage display mode")).toHaveTextContent("Left");
    expect(screen.getByLabelText("Reset timer display mode")).toHaveTextContent("Relative");
    expect(screen.getByLabelText("5-hour leftover from")).toHaveTextContent("Last 1 hour");
    expect(screen.getByLabelText("Record shortcut")).toHaveTextContent("Record Shortcut");

    await fireEvent.click(screen.getByLabelText("Auto-update interval"));
    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeTruthy();
    });
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent?.trim())).toEqual([
      "5 min",
      "15 min",
    ]);
    await fireEvent.click(screen.getByRole("menuitem", { name: "15 min" }));
    expect(onAutoUpdateIntervalChange).toHaveBeenCalledWith(15);

    await fireEvent.click(screen.getByLabelText("Usage display mode"));
    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeTruthy();
    });
    await fireEvent.click(screen.getByRole("menuitem", { name: "Used" }));
    expect(onDisplayModeChange).toHaveBeenCalledWith("used");

    await fireEvent.click(screen.getByLabelText("5-hour leftover from"));
    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeTruthy();
    });
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent?.trim())).toEqual([
      "Last 30 min",
      "Last 1 hour",
      "Last 1.5 hours",
      "Last 2 hours",
    ]);
    await fireEvent.click(screen.getByRole("menuitem", { name: "Last 1.5 hours" }));
    expect(onCrossingGoRemainingMinutesChange).toHaveBeenCalledWith(90);
  });

  it("toggles leftover notify", async () => {
    setup();

    await fireEvent.click(screen.getByRole("switch", { name: "Notify 5-hour leftover" }));
    expect(onLeftoverNotifyEnabledChange).toHaveBeenCalledWith(false);
  });

  it("keeps Global Shortcut as a compact row control", () => {
    setup();

    const label = screen.getByText("Global Shortcut");
    const control = screen.getByLabelText("Record shortcut");
    expect(label.closest(".ui-card")).toBeNull();
    expect(label.className).not.toContain("truncate");
    expect(control.className).toContain("ui-pressable");
    expect(control.className).toContain("h-8");
    expect(control.className.split(/\s+/)).toContain("max-w-[11rem]");
    expect(control.className.split(/\s+/)).not.toContain("w-[11rem]");
    expect(screen.queryByText("Press Escape while recording to clear.")).toBeNull();
  });
});
