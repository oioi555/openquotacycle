import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it } from "vitest";
import TimelinePage from "./timeline.svelte";
import { appUiController } from "../controllers/app-ui-controller.svelte";

describe("timeline page", () => {
  beforeEach(() => {
    appUiController.resetState();
    appUiController.setScreen("timeline");
  });

  it("shows the empty state and Window Starter without shortcut rows", () => {
    render(TimelinePage, { props: { plugins: [] } });

    expect(screen.getByText("No upcoming resets")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Window Starter" })).toBeTruthy();
    expect(screen.getByText("Auto-start")).toBeTruthy();
    expect(screen.queryByText("Customize")).toBeNull();
    expect(screen.queryByText("Choose what's on the Timeline card")).toBeNull();
    expect(screen.queryByText("Start idle 5-hour windows")).toBeNull();
  });
});
