import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it } from "vitest";
import PanelFooter from "./panel-footer.svelte";
import { appUiController } from "../controllers/app-ui-controller.svelte";

describe("panelFooter", () => {
  beforeEach(() => {
    appUiController.resetState();
  });

  it("shows Overview, Timeline, and Settings tabs without Options or a countdown", () => {
    render(PanelFooter);

    expect(screen.getByRole("tab", { name: "Overview" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Timeline" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Settings" })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Overview" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByLabelText("Options")).toBeNull();
    expect(screen.queryByText(/Next update in/)).toBeNull();
    expect(screen.queryByText("Paused")).toBeNull();
    expect(screen.queryByText(/Quotracker/)).toBeNull();
  });

  it("navigates to Timeline and Settings roots", async () => {
    render(PanelFooter);

    await fireEvent.click(screen.getByRole("tab", { name: "Timeline" }));
    expect(appUiController.screen).toBe("timeline");
    expect(screen.getByRole("tab", { name: "Timeline" }).getAttribute("aria-selected")).toBe("true");

    await fireEvent.click(screen.getByRole("tab", { name: "Settings" }));
    expect(appUiController.screen).toBe("settings");
    expect(screen.getByRole("tab", { name: "Settings" }).getAttribute("aria-selected")).toBe("true");
  });

  it("keeps Settings selected on nested Customize and Overview jumps home", async () => {
    appUiController.setScreen("customize:claude");
    render(PanelFooter);

    expect(screen.getByRole("tab", { name: "Settings" }).getAttribute("aria-selected")).toBe("true");

    await fireEvent.click(screen.getByRole("tab", { name: "Overview" }));
    expect(appUiController.screen).toBe("dashboard");
  });

  it("keeps Timeline selected on Timeline customize", () => {
    appUiController.setScreen("customize:timeline");
    render(PanelFooter);

    expect(screen.getByRole("tab", { name: "Timeline" }).getAttribute("aria-selected")).toBe("true");
  });
});
