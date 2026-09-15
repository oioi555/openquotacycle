import { describe, expect, it, vi } from "vitest";
import {
  advanceScreen,
  backScreen,
  isEditableTarget,
  panelController,
  resolveShellKeyAction,
} from "./panel-controller.svelte";

function keyEvent(init: KeyboardEventInit & { key: string }): KeyboardEvent {
  return new KeyboardEvent("keydown", init);
}

describe("resolveShellKeyAction", () => {
  it("maps Escape to back and Enter to advance", () => {
    expect(resolveShellKeyAction(keyEvent({ key: "Escape" }), false)).toBe("back");
    expect(resolveShellKeyAction(keyEvent({ key: "Enter" }), false)).toBe("advance");
  });

  it("does nothing while a dialog is open (dialogs consume Escape)", () => {
    expect(resolveShellKeyAction(keyEvent({ key: "Escape" }), true)).toBeNull();
    expect(resolveShellKeyAction(keyEvent({ key: "Enter" }), true)).toBeNull();
  });

  it("maps Ctrl+, and Ctrl+R regardless of modifier side", () => {
    expect(resolveShellKeyAction(keyEvent({ key: ",", ctrlKey: true }), false)).toBe(
      "toggle-settings",
    );
    expect(resolveShellKeyAction(keyEvent({ key: "r", ctrlKey: true }), false)).toBe("refresh");
    expect(resolveShellKeyAction(keyEvent({ key: "R", ctrlKey: true }), false)).toBe("refresh");
    expect(resolveShellKeyAction(keyEvent({ key: "r", metaKey: true }), false)).toBe("refresh");
  });

  it("ignores modified plain keys and default-prevented or editable targets", () => {
    expect(resolveShellKeyAction(keyEvent({ key: "r" }), false)).toBeNull();
    expect(
      resolveShellKeyAction(keyEvent({ key: "r", ctrlKey: true, altKey: true }), false),
    ).toBeNull();
    expect(
      resolveShellKeyAction(keyEvent({ key: "Escape" }), false),
    ).toBe("back");

    const prevented = keyEvent({ key: "Escape", cancelable: true });
    prevented.preventDefault();
    expect(resolveShellKeyAction(prevented, false)).toBeNull();

    const input = document.createElement("input");
    const inputEvent = new KeyboardEvent("keydown", { key: "Escape" });
    Object.defineProperty(inputEvent, "target", { value: input });
    expect(resolveShellKeyAction(inputEvent, false)).toBeNull();
  });
});

describe("backScreen / advanceScreen", () => {
  it("nested screens step toward their parent tab", () => {
    expect(backScreen("customize:claude")).toBe("customize");
    expect(backScreen("customize")).toBe("settings");
    expect(backScreen("customize:timeline")).toBe("timeline");
    expect(backScreen("settings")).toBe("settings");
    expect(backScreen("timeline")).toBe("timeline");
    expect(backScreen("dashboard")).toBe("dashboard");
  });

  it("only the dashboard advances into Customize", () => {
    expect(advanceScreen("dashboard")).toBe("customize");
    expect(advanceScreen("timeline")).toBe("timeline");
    expect(advanceScreen("settings")).toBe("settings");
    expect(advanceScreen("customize:claude")).toBe("customize");
    expect(advanceScreen("customize:timeline")).toBe("timeline");
  });
});

describe("isEditableTarget", () => {
  it("detects editable elements", () => {
    const input = document.createElement("input");
    expect(isEditableTarget(input)).toBe(true);

    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    expect(isEditableTarget(editable)).toBe(true);
  });

  it("ignores non-editable elements", () => {
    const div = document.createElement("div");
    expect(isEditableTarget(div)).toBe(false);
    expect(isEditableTarget(null)).toBe(false);
  });
});

describe("panelController", () => {
  it("updates the scroll indicator state", () => {
    const el = document.createElement("div");
    panelController.updateScrollState(el);
    expect(panelController.canScrollDown).toBe(false);

    panelController.updateScrollState(null);
    expect(panelController.canScrollDown).toBe(false);
  });
});
