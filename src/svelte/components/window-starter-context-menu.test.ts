import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import WindowStarterContextMenu from "./window-starter-context-menu.svelte";

function setup(
  overrides: {
    participationEnabled?: boolean;
    customizeEnabled?: boolean;
    runEnabled?: boolean;
  } = {},
) {
  const onAction = vi.fn();
  const onClose = vi.fn();
  render(WindowStarterContextMenu, {
    props: {
      x: 100,
      y: 100,
      participationEnabled: overrides.participationEnabled ?? true,
      customizeEnabled: overrides.customizeEnabled ?? true,
      runEnabled: overrides.runEnabled ?? true,
      onAction,
      onClose,
    },
  });
  return { onAction, onClose };
}

describe("windowStarterContextMenu", () => {
  it("lists Turn off, Customize, and Run now with a separator", () => {
    setup();

    for (const label of ["Turn off", "Customize…", "Run now…"]) {
      const item = screen.getByRole("menuitem", { name: label });
      expect(item.querySelector("svg")).toBeTruthy();
    }
    expect(screen.getByRole("separator")).toBeTruthy();
    expect(screen.getByRole("menu").className).toContain("ui-menu");
  });

  it("labels the participation item Turn on when the window is off", () => {
    setup({ participationEnabled: false });

    expect(screen.getByRole("menuitem", { name: "Turn on" })).toBeTruthy();
    expect(screen.queryByRole("menuitem", { name: "Turn off" })).toBeNull();
  });

  it("dispatches toggle and closes", async () => {
    const { onAction, onClose } = setup();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Turn off" }));
    expect(onAction).toHaveBeenCalledWith("toggle");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dispatches customize and closes", async () => {
    const { onAction, onClose } = setup();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Customize…" }));
    expect(onAction).toHaveBeenCalledWith("customize");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("dispatches run and closes", async () => {
    const { onAction, onClose } = setup();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Run now…" }));
    expect(onAction).toHaveBeenCalledWith("run");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables Customize and Run now when unavailable", () => {
    setup({ customizeEnabled: false, runEnabled: false });

    expect(screen.getByRole("menuitem", { name: "Customize…" }).hasAttribute("disabled")).toBe(true);
    expect(screen.getByRole("menuitem", { name: "Run now…" }).hasAttribute("disabled")).toBe(true);
  });

  it("closes on Escape", async () => {
    const { onClose } = setup();

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
