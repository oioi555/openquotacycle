// @vitest-environment node
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { TAURI_COMMANDS } from "./backend";

const LIB_RS = resolve(process.cwd(), "src-tauri/src/lib.rs");

function registeredCommands(): string[] {
  const source = readFileSync(LIB_RS, "utf8");
  const match = source.match(/generate_handler!\[([\s\S]*?)\]/);
  if (!match) return [];

  return match[1]
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => {
      const name = entry.includes("::") ? entry.split("::").pop() : entry;
      return (name ?? "").trim();
    });
}

describe("backend Tauri contract", () => {
  it("only references commands registered in src-tauri", () => {
    const registered = new Set(registeredCommands());
    expect(registered.size).toBeGreaterThan(0);

    const missing = TAURI_COMMANDS.filter((command) => !registered.has(command));
    expect(missing).toEqual([]);
  });
});
