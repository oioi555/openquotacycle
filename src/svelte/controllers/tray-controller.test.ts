import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { PluginSettings } from "@/lib/settings";
import { trayController } from "./tray-controller.svelte";

const backendMocks = vi.hoisted(() => ({
  setTrayTooltip: vi.fn(async () => {}),
}));

vi.mock("../lib/backend", () => backendMocks);

const settings: PluginSettings = { order: ["claude", "codex"], disabled: [] };

const CLAUDE_META = { id: "claude", name: "Claude", iconUrl: "claude.svg", brandColor: "#de7356", lines: [] };
const CODEX_META = { id: "codex", name: "Codex", iconUrl: "codex.svg", brandColor: "#10a37f", lines: [] };

function seedInputs(pluginSettings: PluginSettings = settings): void {
  trayController.syncInputs({
    pluginsMeta: [CLAUDE_META, CODEX_META],
    pluginSettings,
    pluginStates: {},
    displayMode: "left",
  });
}

async function flush(): Promise<void> {
  await vi.advanceTimersByTimeAsync(0);
  await vi.advanceTimersByTimeAsync(0);
}

describe("trayController", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
    trayController.dispose();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("init marks the tray ready without a Tauri tray handle", async () => {
    await trayController.init();
    expect(trayController.trayReady).toBe(true);
    expect(backendMocks.setTrayTooltip).not.toHaveBeenCalled();
  });

  it("sends the provider summary tooltip once, then skips identical updates", async () => {
    await trayController.init();
    seedInputs();

    trayController.scheduleUpdate("init", 0);
    await flush();

    expect(backendMocks.setTrayTooltip).toHaveBeenCalledTimes(1);
    expect(backendMocks.setTrayTooltip).toHaveBeenCalledWith(
      "Quotracker\nClaude: --%\nCodex: --%",
    );

    trayController.scheduleUpdate("settings", 0);
    await flush();

    expect(backendMocks.setTrayTooltip).toHaveBeenCalledTimes(1);
  });

  it("sends a plain tooltip when no settings exist yet", async () => {
    await trayController.init();

    trayController.syncInputs({
      pluginsMeta: [],
      pluginSettings: null,
      pluginStates: {},
      displayMode: "left",
    });
    trayController.scheduleUpdate("init", 0);
    await flush();

    expect(backendMocks.setTrayTooltip).toHaveBeenCalledWith("Quotracker");
  });

  it("collapses burst schedule requests into a single update", async () => {
    await trayController.init();
    seedInputs();

    trayController.scheduleUpdate("settings", 0);
    trayController.scheduleUpdate("settings", 0);
    trayController.scheduleUpdate("settings", 0);
    await flush();

    expect(backendMocks.setTrayTooltip).toHaveBeenCalledTimes(1);
  });
});
