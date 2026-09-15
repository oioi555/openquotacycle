// Pure shortcut capture/display helpers extracted from the React
// global-shortcut-section for reuse by the Svelte port.

export type ShortcutPlatform = "macos" | "linux" | "windows" | "unknown";

export function detectShortcutPlatform(): ShortcutPlatform {
  if (typeof navigator === "undefined") return "unknown";

  const platform = navigator.platform.toLowerCase();
  if (platform.includes("mac")) return "macos";
  if (platform.includes("win")) return "windows";
  if (platform.includes("linux")) return "linux";

  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes("mac os")) return "macos";
  if (userAgent.includes("windows")) return "windows";
  if (userAgent.includes("linux")) return "linux";

  return "unknown";
}

export function formatModifierForDisplay(
  modifier: string,
  platform: ShortcutPlatform,
): string {
  if (modifier === "CommandOrControl") return platform === "macos" ? "Cmd" : "Ctrl";
  if (modifier === "Command") return "Cmd";
  if (modifier === "Control") return "Ctrl";
  if (modifier === "Option") return "Opt";
  if (modifier === "Alt") return platform === "macos" ? "Opt" : "Alt";
  if (modifier === "Super") return platform === "windows" ? "Win" : "Super";
  return modifier;
}

/** "CommandOrControl+Shift+U" -> "Ctrl + Shift + U" (platform aware). */
export function formatShortcutForDisplay(
  shortcut: string,
  platform: ShortcutPlatform = detectShortcutPlatform(),
): string {
  return shortcut
    .split("+")
    .map((part) => formatModifierForDisplay(part, platform))
    .join(" + ");
}

// Modifier codes (using event.code for reliable detection)
export const MODIFIER_CODES = new Set([
  "MetaLeft",
  "MetaRight",
  "ControlLeft",
  "ControlRight",
  "AltLeft",
  "AltRight",
  "ShiftLeft",
  "ShiftRight",
]);

// Normalize modifier code to base name
export function normalizeModifierCode(code: string): string {
  if (code.startsWith("Meta")) return "Meta";
  if (code.startsWith("Control")) return "Control";
  if (code.startsWith("Alt")) return "Alt";
  if (code.startsWith("Shift")) return "Shift";
  return code;
}

// Convert event.code to a display-friendly key name
export function codeToDisplayKey(code: string): string {
  // Handle letter keys (KeyA -> A)
  if (code.startsWith("Key")) return code.slice(3);
  // Handle digit keys (Digit1 -> 1)
  if (code.startsWith("Digit")) return code.slice(5);
  // Handle numpad (Numpad1 -> Num1)
  if (code.startsWith("Numpad")) return "Num" + code.slice(6);
  // Handle special keys
  const specialKeys: Record<string, string> = {
    Space: "Space",
    Enter: "Enter",
    Backspace: "Backspace",
    Tab: "Tab",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Escape: "Esc",
    Delete: "Del",
    Insert: "Ins",
    Home: "Home",
    End: "End",
    PageUp: "PgUp",
    PageDown: "PgDn",
    BracketLeft: "[",
    BracketRight: "]",
    Backslash: "\\",
    Semicolon: ";",
    Quote: "'",
    Comma: ",",
    Period: ".",
    Slash: "/",
    Backquote: "`",
    Minus: "-",
    Equal: "=",
  };
  return specialKeys[code] || code;
}

// Convert event.code to Tauri shortcut key format
export function codeToTauriKey(code: string): string {
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  const specialKeys: Record<string, string> = {
    Space: "Space",
    Enter: "Return",
    Backspace: "Backspace",
    Tab: "Tab",
    ArrowUp: "Up",
    ArrowDown: "Down",
    ArrowLeft: "Left",
    ArrowRight: "Right",
    Delete: "Delete",
    Insert: "Insert",
    Home: "Home",
    End: "End",
    PageUp: "PageUp",
    PageDown: "PageDown",
  };
  return specialKeys[code] || code;
}

export function modifierCodeToTauriModifier(
  code: string,
  platform: ShortcutPlatform,
): string | null {
  const normalized = normalizeModifierCode(code);
  if (normalized === "Meta") return platform === "macos" ? "CommandOrControl" : "Super";
  if (normalized === "Control") return "Control";
  if (normalized === "Alt") return "Alt";
  if (normalized === "Shift") return "Shift";
  return null;
}

// Build shortcut array from currently pressed keys (modifiers + main key)
export function buildShortcutFromCodes(
  codes: Set<string>,
  platform: ShortcutPlatform = detectShortcutPlatform(),
): { display: string; tauri: string | null } {
  const modifiers: string[] = [];
  const displayMods: string[] = [];
  let mainCode: string | null = null;

  for (const code of codes) {
    if (MODIFIER_CODES.has(code)) {
      const modifier = modifierCodeToTauriModifier(code, platform);
      if (modifier && !modifiers.includes(modifier)) {
        modifiers.push(modifier);
        displayMods.push(formatModifierForDisplay(modifier, platform));
      }
    } else {
      // Non-modifier key - use the last one pressed
      mainCode = code;
    }
  }

  // Build display string
  const displayParts = [...displayMods];
  if (mainCode) {
    displayParts.push(codeToDisplayKey(mainCode));
  }
  const display = displayParts.join(" + ");

  // Build Tauri shortcut (only valid with at least one modifier AND a main key)
  let tauri: string | null = null;
  if (modifiers.length > 0 && mainCode) {
    tauri = [...modifiers, codeToTauriKey(mainCode)].join("+");
  }

  return { display, tauri };
}
