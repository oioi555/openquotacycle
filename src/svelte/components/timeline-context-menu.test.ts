import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import TimelineContextMenu from "./timeline-context-menu.svelte";

function setup() {
  const onAction = vi.fn();
  const onClose = vi.fn();
  render(TimelineContextMenu, {
    props: { x: 100, y: 100, onAction, onClose },
  });
  return { onAction, onClose };
}

describe("timelineContextMenu", () => {
  it("lists Customize and Hide with leading icons", () => {
    setup();

    for (const label of ["Customize…", "Hide Timeline"]) {
      const item = screen.getByRole("menuitem", { name: label });
      expect(item.querySelector("svg")).toBeTruthy();
    }
    expect(screen.queryByRole("menuitem", { name: "Refresh usage" })).toBeNull();
    expect(screen.queryByRole("menuitem", { name: "Inspect Element" })).toBeNull();
    expect(screen.getByRole("menu").className).toContain("ui-menu");
  });

  it("dispatches customize and closes", async () => {
    const { onAction, onClose } = setup();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Customize…" }));
    expect(onAction).toHaveBeenCalledWith("customize");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dispatches hide and closes", async () => {
    const { onAction, onClose } = setup();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Hide Timeline" }));
    expect(onAction).toHaveBeenCalledWith("hide");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const { onClose } = setup();

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
