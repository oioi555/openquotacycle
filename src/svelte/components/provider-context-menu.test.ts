import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProviderContextMenu from "./provider-context-menu.svelte";

const backendMocks = vi.hoisted(() => ({
  openDevtools: vi.fn(async () => {}),
}));

vi.mock("../lib/backend", () => backendMocks);

function setup(refreshEnabled = true) {
  const onAction = vi.fn();
  const onClose = vi.fn();
  render(ProviderContextMenu, {
    props: { x: 100, y: 100, refreshEnabled, onAction, onClose },
  });
  return { onAction, onClose };
}

describe("providerContextMenu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lists every action with a leading icon", () => {
    setup();

    for (const label of ["Refresh usage", "Customize…", "Disable plugin", "Inspect Element"]) {
      const item = screen.getByRole("menuitem", { name: label });
      const icon = item.querySelector("svg");
      expect(icon).toBeTruthy();
      expect(icon?.className.toString() ?? "").not.toContain("text-muted-foreground");
    }
    expect(screen.getByRole("separator")).toBeTruthy();
    expect(screen.getByRole("menu").className).toContain("ui-menu");
  });

  it("dispatches reload and closes", async () => {
    const { onAction, onClose } = setup();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Refresh usage" }));
    expect(onAction).toHaveBeenCalledWith("reload");
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("disables refresh when unavailable", () => {
    setup(false);

    expect(screen.getByRole("menuitem", { name: "Refresh usage" }).hasAttribute("disabled")).toBe(true);
  });

  it("marks disable as destructive and dispatches remove", async () => {
    const { onAction } = setup();

    const item = screen.getByRole("menuitem", { name: "Disable plugin" });
    expect(item.className).toContain("text-destructive");
    await fireEvent.click(item);
    expect(onAction).toHaveBeenCalledWith("remove");
  });

  it("opens devtools for inspect without dispatching an action", async () => {
    const { onAction, onClose } = setup();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Inspect Element" }));
    expect(backendMocks.openDevtools).toHaveBeenCalledTimes(1);
    expect(onAction).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on Escape", async () => {
    const { onClose } = setup();

    await fireEvent.keyDown(window, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("closes on outside pointer down but not inside", async () => {
    const { onClose } = setup();

    await fireEvent.pointerDown(screen.getByRole("menu"));
    expect(onClose).not.toHaveBeenCalled();
    await fireEvent.pointerDown(document.body);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
