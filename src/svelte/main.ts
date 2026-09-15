import { mount } from "svelte";
import { error as logError, warn as logWarn } from "@tauri-apps/plugin-log";
import App from "./App.svelte";
import "../index.css";

// Forward console.error and console.warn to the Tauri log file.
function stringify(arg: unknown): string {
  if (arg === null) return "null";
  if (arg === undefined) return "undefined";
  if (typeof arg === "string") return arg;
  if (arg instanceof Error) return `${arg.name}: ${arg.message}`;
  try {
    return JSON.stringify(arg);
  } catch {
    return String(arg);
  }
}

const originalError = console.error;
console.error = (...args: unknown[]) => {
  originalError(...args);
  logError(args.map(stringify).join(" ")).catch(() => {});
};

const originalWarn = console.warn;
console.warn = (...args: unknown[]) => {
  originalWarn(...args);
  logWarn(args.map(stringify).join(" ")).catch(() => {});
};

const app = mount(App, { target: document.getElementById("root") as HTMLElement });

export default app;
