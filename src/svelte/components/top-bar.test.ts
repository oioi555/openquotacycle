import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TopBar from "./top-bar.svelte";

describe("topBar", () => {
  it("renders the centered title and fires back", async () => {
    const onBack = vi.fn();
    render(TopBar, { props: { title: "Settings", onBack } });

    expect(screen.getByText("Settings")).toBeTruthy();
    await fireEvent.click(screen.getByLabelText("Back"));
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("omits back on a dashboard-style bar", () => {
    render(TopBar, { props: { title: "Overview", onRefresh: vi.fn(), autoUpdateNextAt: null } });

    expect(screen.queryByLabelText("Back")).toBeNull();
    expect(screen.getByText("Overview")).toBeTruthy();
  });

  it("omits the refresh control when no handler is provided", () => {
    render(TopBar, { props: { title: "Empty" } });

    expect(screen.queryByLabelText("Refresh")).toBeNull();
    expect(screen.queryByLabelText("Back")).toBeNull();
  });

  it("shows sliders without back or countdown on a Timeline-style bar", async () => {
    const onRefresh = vi.fn();
    render(TopBar, {
      props: {
        title: "Timeline",
        onRefresh,
        refreshTitle: "Customize",
        refreshIcon: "sliders",
        autoUpdateNextAt: Date.now() + 90_000,
      },
    });

    expect(screen.queryByLabelText("Back")).toBeNull();
    expect(screen.queryByText("2m")).toBeNull();
    await fireEvent.click(screen.getByLabelText("Customize"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("fires refresh from the right side of the header", async () => {
    const onRefresh = vi.fn();
    render(TopBar, { props: { title: "Customize", onBack: vi.fn(), onRefresh } });

    await fireEvent.click(screen.getByLabelText("Refresh"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });

  it("renders the reset icon with a custom title", async () => {
    const onRefresh = vi.fn();
    render(TopBar, {
      props: {
        title: "Claude",
        onBack: vi.fn(),
        onRefresh,
        refreshTitle: "Reset metric order",
        refreshIcon: "reset",
        autoUpdateNextAt: Date.now() + 90_000,
      },
    });

    await fireEvent.click(screen.getByLabelText("Reset metric order"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("2m")).toBeNull();
    expect(screen.queryByText("Off")).toBeNull();
  });

  it("shows Off on the left when auto-refresh is paused", () => {
    render(TopBar, {
      props: { title: "Overview", onRefresh: vi.fn(), autoUpdateNextAt: null },
    });

    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.getByLabelText("Auto refresh paused")).toBeTruthy();
    expect(screen.getByLabelText("Refresh")).toBeTruthy();
    expect(screen.queryByText("Paused")).toBeNull();
  });

  it("keeps Back and shows the countdown on a Refresh control", async () => {
    render(TopBar, {
      props: {
        title: "Window Starter",
        onBack: vi.fn(),
        onRefresh: vi.fn(),
        autoUpdateNextAt: Date.now() + 90_000,
      },
    });

    expect(screen.getByLabelText("Back")).toBeTruthy();
    await waitFor(() => {
      expect(screen.getByText("2m")).toBeTruthy();
    });
    expect(screen.queryByText("Next update in 2m")).toBeNull();
  });

  it("shows hourglass plus 2m on the left and refreshes from the icon", async () => {
    const onRefresh = vi.fn();
    render(TopBar, {
      props: {
        title: "Overview",
        onRefresh,
        autoUpdateNextAt: Date.now() + 90_000,
      },
    });

    await waitFor(() => {
      expect(screen.getByText("2m")).toBeTruthy();
    });
    expect(screen.getByLabelText("Next update in 2m")).toBeTruthy();
    expect(screen.queryByText(/in 2m/)).toBeNull();
    await fireEvent.click(screen.getByLabelText("Refresh"));
    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
