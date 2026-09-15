import { describe, expect, it } from "vitest";
import {
  buildShortcutFromCodes,
  formatShortcutForDisplay,
} from "./shortcut-capture";

describe("shortcut capture helpers", () => {
  it("formats shortcuts for display per platform", () => {
    expect(formatShortcutForDisplay("CommandOrControl+Shift+U", "macos")).toBe(
      "Cmd + Shift + U",
    );
    expect(formatShortcutForDisplay("CommandOrControl+Shift+U", "linux")).toBe(
      "Ctrl + Shift + U",
    );
    expect(formatShortcutForDisplay("Super+Q", "windows")).toBe("Win + Q");
  });

  it("builds a valid shortcut from pressed codes", () => {
    const { display, tauri } = buildShortcutFromCodes(
      new Set(["ControlLeft", "ShiftLeft", "KeyU"]),
      "linux",
    );
    expect(display).toBe("Ctrl + Shift + U");
    expect(tauri).toBe("Control+Shift+U");
  });

  it("returns no tauri shortcut without a modifier", () => {
    const { tauri } = buildShortcutFromCodes(new Set(["KeyA"]), "linux");
    expect(tauri).toBeNull();
  });

  it("maps Meta to Super on linux and CommandOrControl on macos", () => {
    expect(
      buildShortcutFromCodes(new Set(["MetaRight", "Digit1"]), "linux").tauri,
    ).toBe("Super+1");
    expect(
      buildShortcutFromCodes(new Set(["MetaLeft", "Digit1"]), "macos").tauri,
    ).toBe("CommandOrControl+1");
  });
});
