import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import CustomizeTimelinePage from "./customize-timeline.svelte";

function setup(visibleRows: Array<"five-hour" | "weekly"> = ["five-hour", "weekly"]) {
  const onToggle = vi.fn();
  const result = render(CustomizeTimelinePage, { props: { visibleRows, onToggle } });
  return { ...result, onToggle };
}

describe("customizeTimeline (Customize L2)", () => {
  it("lists 5-hour and Weekly dashboard card rows", () => {
    setup();

    expect(screen.getByText("Dashboard card")).toBeTruthy();
    expect(screen.getByText("5-hour")).toBeTruthy();
    expect(screen.getByText("Weekly")).toBeTruthy();
    expect(screen.queryByText("Always Visible")).toBeNull();
    expect(screen.queryByText("On Demand")).toBeNull();
    expect(screen.getByLabelText("Show 5-hour on Timeline card").getAttribute("aria-checked")).toBe(
      "true",
    );
    expect(screen.getByLabelText("Show Weekly on Timeline card").getAttribute("aria-checked")).toBe(
      "true",
    );
  });

  it("emits row visibility changes", async () => {
    const { onToggle } = setup(["five-hour"]);

    expect(screen.getByLabelText("Show Weekly on Timeline card").getAttribute("aria-checked")).toBe(
      "false",
    );
    await fireEvent.click(screen.getByLabelText("Show Weekly on Timeline card"));
    expect(onToggle).toHaveBeenCalledWith("weekly", true);
  });
});
