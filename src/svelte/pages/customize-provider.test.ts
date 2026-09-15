import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { tick } from "svelte";
import { describe, expect, it, vi } from "vitest";
import CustomizeProviderPage from "./customize-provider.svelte";
import type { SettingsPluginConfig } from "../lib/view-types";

const plugin: SettingsPluginConfig = {
  id: "claude",
  name: "Claude",
  enabled: true,
  iconUrl: "/icons/claude.svg",
  brandColor: "#de7356",
  overviewProgressBars: [
    { label: "Session", checked: true },
    { label: "Weekly", checked: false },
    { label: "Credits", checked: true },
    { label: "Extra Usage", checked: false },
    { label: "Today", checked: true },
  ],
};

function setup() {
  const handlers = {
    onToggleOverviewProgressBar: vi.fn(),
    onOverviewLineReorder: vi.fn(),
  };
  const result = render(CustomizeProviderPage, { props: { plugin, ...handlers } });
  return { ...result, handlers };
}

function zoneLabels(zone: string): (string | null)[] {
  const list = screen.getByLabelText(zone);
  return Array.from(list.querySelectorAll("[data-overview-line]"), (row) =>
    row.getAttribute("data-overview-line"),
  );
}

describe("customizeProvider (Customize L2)", () => {
  it("splits lines into Always Visible / On Demand sections", () => {
    setup();

    expect(screen.getByText("Always Visible")).toBeTruthy();
    expect(screen.getByText("On Demand")).toBeTruthy();
    expect(screen.queryByText(/dashboard card always shows/)).toBeNull();
    expect(zoneLabels("Always visible metric list")).toEqual(["Session", "Credits", "Today"]);
    expect(zoneLabels("On demand metric list")).toEqual(["Weekly", "Extra Usage"]);
  });

  it("lets every progress line be classified On-Demand (no mandatory first)", () => {
    setup();

    const first = screen.getByLabelText("Show Session on Overview");
    expect(first.getAttribute("aria-checked")).toBe("true");
    expect(first.getAttribute("aria-disabled")).toBeNull();
  });

  it("emits progress-bar classification changes", async () => {
    const { handlers } = setup();

    (screen.getByLabelText("Show Weekly on Overview") as HTMLInputElement).click();
    expect(handlers.onToggleOverviewProgressBar).toHaveBeenCalledWith("claude", "Weekly", true);
  });

  it("emits per-text-line classification changes", async () => {
    const { handlers } = setup();

    (screen.getByLabelText("Show Extra Usage on Overview") as HTMLInputElement).click();
    expect(handlers.onToggleOverviewProgressBar).toHaveBeenCalledWith(
      "claude",
      "Extra Usage",
      true,
    );
  });

  it("leaves order reset to the top bar (no in-page reset button)", () => {
    setup();

    expect(screen.queryByLabelText("Reset metric order")).toBeNull();
  });

  it("reorders within a zone without spurious classification changes", async () => {
    const { container, handlers } = setup();
    const list = container.querySelector('[aria-label="Always visible metric list"]');
    expect(list).toBeTruthy();

    const reordered = [
      { ...plugin.overviewProgressBars[2], id: "Credits" },
      { ...plugin.overviewProgressBars[0], id: "Session" },
      { ...plugin.overviewProgressBars[4], id: "Today" },
    ];
    list?.dispatchEvent(new CustomEvent("consider", { detail: { items: reordered } }));
    await tick();
    expect(zoneLabels("Always visible metric list")).toEqual(["Credits", "Session", "Today"]);

    list?.dispatchEvent(new CustomEvent("finalize", { detail: { items: reordered } }));
    expect(handlers.onToggleOverviewProgressBar).not.toHaveBeenCalled();
    expect(handlers.onOverviewLineReorder).toHaveBeenCalledWith("claude", [
      "Credits",
      "Session",
      "Today",
      "Weekly",
      "Extra Usage",
    ]);
  });

  it("reclassifies rows dropped across zones", async () => {
    const { container, handlers } = setup();
    const alwaysList = container.querySelector('[aria-label="Always visible metric list"]');
    const demandList = container.querySelector('[aria-label="On demand metric list"]');
    expect(alwaysList).toBeTruthy();
    expect(demandList).toBeTruthy();

    // Full drag sequence: consider events move the shadow item through both
    // zones, then finalize drops Session into On Demand.
    const demandItems = [
      { ...plugin.overviewProgressBars[1], id: "Weekly" },
      { ...plugin.overviewProgressBars[3], id: "Extra Usage" },
      { ...plugin.overviewProgressBars[0], id: "Session" },
    ];
    const alwaysItems = [
      { ...plugin.overviewProgressBars[2], id: "Credits" },
      { ...plugin.overviewProgressBars[4], id: "Today" },
    ];
    demandList?.dispatchEvent(new CustomEvent("consider", { detail: { items: demandItems } }));
    alwaysList?.dispatchEvent(new CustomEvent("consider", { detail: { items: alwaysItems } }));
    await tick();
    demandList?.dispatchEvent(new CustomEvent("finalize", { detail: { items: demandItems } }));

    expect(handlers.onToggleOverviewProgressBar).toHaveBeenCalledWith("claude", "Session", false);
    expect(handlers.onOverviewLineReorder).toHaveBeenCalledWith("claude", [
      "Credits",
      "Today",
      "Weekly",
      "Extra Usage",
      "Session",
    ]);
  });

  it("keeps the order when a drop happens outside a drag", async () => {
    const { container, handlers } = setup();
    const second = container.querySelectorAll("[data-overview-line]")[1] as HTMLElement;

    await fireEvent.drop(second);
    expect(handlers.onOverviewLineReorder).not.toHaveBeenCalled();
    expect(handlers.onToggleOverviewProgressBar).not.toHaveBeenCalled();
  });
});

function starterPlugin(overrides: Partial<SettingsPluginConfig> = {}): SettingsPluginConfig {
  return {
    ...plugin,
    windowStarter: {
      defaultRunner: "claude",
      allowedRunners: ["claude"],
      runnerId: "claude",
      windows: [{ id: "session", line: "Session", enabled: true }],
    },
    ...overrides,
  };
}

describe("customizeProvider Window Starter", () => {
  it("shows a participation switch and a fixed Claude Code label", () => {
    render(CustomizeProviderPage, {
      props: {
        plugin: starterPlugin(),
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
      },
    });

    expect(screen.getByLabelText("Window Starter")).toBeTruthy();
    expect(screen.getByLabelText("Window Starter participation")).toBeTruthy();
    expect(screen.getByText("Claude Code")).toBeTruthy();
    expect(screen.queryByLabelText("Window Starter runner")).toBeNull();
    expect(screen.queryByText("OpenCode")).toBeNull();
    expect(screen.queryByText("Hermes")).toBeNull();
    expect(screen.queryByText("Pi")).toBeNull();
    expect(screen.queryByLabelText("Window Starter model")).toBeNull();
  });

  it("offers zcode, OpenCode, Hermes, and Pi for Z.ai and not Claude Code", async () => {
    const onWindowStarterRunner = vi.fn();
    render(CustomizeProviderPage, {
      props: {
        plugin: starterPlugin({
          id: "zai",
          name: "Z.ai",
          windowStarter: {
            defaultRunner: "zcode",
            allowedRunners: ["zcode", "opencode", "hermes", "pi"],
            runnerId: "zcode",
            windows: [{ id: "session", line: "Session", enabled: true }],
          },
        }),
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
        onWindowStarterRunner,
      },
    });

    expect(screen.getByLabelText("Window Starter runner").className).toContain("ui-pressable");
    await fireEvent.click(screen.getByLabelText("Window Starter runner"));
    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeTruthy();
    });
    expect(screen.getByRole("menu").className).toContain("ui-menu");
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent?.trim())).toEqual([
      "zcode",
      "OpenCode",
      "Hermes",
      "Pi",
    ]);
    expect(screen.queryByText("Claude Code")).toBeNull();
    expect(screen.queryByLabelText("Window Starter model")).toBeNull();

    await fireEvent.click(screen.getByRole("menuitem", { name: "Pi" }));
    expect(onWindowStarterRunner).toHaveBeenCalledWith("zai", "pi");
  });

  it("offers Codex, OpenCode, Hermes, and Pi for Codex", async () => {
    render(CustomizeProviderPage, {
      props: {
        plugin: starterPlugin({
          id: "codex",
          name: "Codex",
          windowStarter: {
            defaultRunner: "codex",
            allowedRunners: ["codex", "opencode", "hermes", "pi"],
            runnerId: "codex",
            windows: [{ id: "session", line: "Session", enabled: true }],
          },
        }),
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByLabelText("Window Starter runner"));
    await waitFor(() => {
      expect(screen.getByRole("menu")).toBeTruthy();
    });
    expect(screen.getAllByRole("menuitem").map((item) => item.textContent?.trim())).toEqual([
      "Codex",
      "OpenCode",
      "Hermes",
      "Pi",
    ]);
  });

  it("shows independent Session and Claude toggles for Antigravity, not model names", async () => {
    const onWindowStarterWindow = vi.fn();
    render(CustomizeProviderPage, {
      props: {
        plugin: starterPlugin({
          id: "antigravity",
          name: "Antigravity",
          windowStarter: {
            defaultRunner: "agy",
            allowedRunners: ["agy"],
            runnerId: "agy",
            windows: [
              { id: "session", line: "Session", enabled: false },
              { id: "claude", line: "Claude", enabled: false },
            ],
          },
        }),
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
        onWindowStarterWindow,
      },
    });

    expect(screen.getByLabelText("Start Session window")).toBeTruthy();
    expect(screen.getByLabelText("Start Claude window")).toBeTruthy();
    expect(screen.getByText("agy")).toBeTruthy();
    expect(screen.queryByLabelText("Window Starter runner")).toBeNull();
    expect(screen.queryByText("gemini-3.8-flash-low")).toBeNull();
    expect(screen.queryByText("claude-sonnet-4-6")).toBeNull();
    expect(screen.queryByLabelText("Window Starter participation")).toBeNull();

    (screen.getByLabelText("Start Session window") as HTMLInputElement).click();
    expect(onWindowStarterWindow).toHaveBeenCalledWith("antigravity", "session", true);
  });

  it("shows Auto-start agy on Antigravity Customize L2", async () => {
    const onAntigravityAgyAutoWake = vi.fn();
    render(CustomizeProviderPage, {
      props: {
        plugin: starterPlugin({
          id: "antigravity",
          name: "Antigravity",
          antigravityAgyAutoWake: false,
          windowStarter: {
            defaultRunner: "agy",
            allowedRunners: ["agy"],
            runnerId: "agy",
            windows: [
              { id: "session", line: "Session", enabled: false },
              { id: "claude", line: "Claude", enabled: false },
            ],
          },
        }),
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
        onAntigravityAgyAutoWake,
      },
    });

    const headings = Array.from(document.querySelectorAll("h3"), (heading) => heading.textContent?.trim());
    expect(headings).toContain("Credentials");
    const toggle = screen.getByLabelText("Auto-start agy");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    (toggle as HTMLInputElement).click();
    expect(onAntigravityAgyAutoWake).toHaveBeenCalledWith(true);
  });

  it("hides Auto-start agy on other providers", () => {
    render(CustomizeProviderPage, {
      props: {
        plugin: starterPlugin(),
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
      },
    });
    expect(screen.queryByLabelText("Auto-start agy")).toBeNull();
    expect(screen.queryByLabelText("Auto-start grok")).toBeNull();
  });

  it("shows Auto-start grok on Grok Customize L2", async () => {
    const onGrokAutoWake = vi.fn();
    render(CustomizeProviderPage, {
      props: {
        plugin: {
          id: "grok",
          name: "Grok",
          enabled: true,
          iconUrl: "/icons/grok.svg",
          overviewProgressBars: [{ label: "Weekly", checked: true }],
          grokAutoWake: false,
        },
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
        onGrokAutoWake,
      },
    });

    const headings = Array.from(document.querySelectorAll("h3"), (heading) => heading.textContent?.trim());
    expect(headings).toContain("Credentials");
    const toggle = screen.getByLabelText("Auto-start grok");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    (toggle as HTMLInputElement).click();
    expect(onGrokAutoWake).toHaveBeenCalledWith(true);
    expect(screen.queryByLabelText("Auto-start agy")).toBeNull();
  });

  it("places Window Starter after Always Visible and On Demand", () => {
    render(CustomizeProviderPage, {
      props: {
        plugin: starterPlugin(),
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
      },
    });

    const headings = Array.from(document.querySelectorAll("h3"), (heading) => heading.textContent?.trim());
    expect(headings).toEqual(["Always Visible", "On Demand", "Window Starter"]);
  });

  it("copies the selected runner command with the starter prompt embedded", async () => {
    const writeText = vi.fn(async () => {});
    Object.assign(navigator, { clipboard: { writeText } });

    render(CustomizeProviderPage, {
      props: {
        plugin: starterPlugin(),
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByLabelText("Copy runner command"));
    expect(writeText).toHaveBeenCalledWith(
      `claude -p 'Quotracker Window Starter request. Respond with only "OK".' --model claude-haiku-4-5 --tools "" --max-turns 1 --no-session-persistence`,
    );
  });

  it("hides Window Starter controls when the plugin omits the capability", () => {
    render(CustomizeProviderPage, {
      props: {
        plugin: {
          id: "opencode-go",
          name: "OpenCode Go",
          enabled: true,
          iconUrl: "",
          overviewProgressBars: [{ label: "5h", checked: true }],
        },
        onToggleOverviewProgressBar: vi.fn(),
        onOverviewLineReorder: vi.fn(),
      },
    });

    expect(screen.queryByLabelText("Window Starter")).toBeNull();
    expect(screen.queryByLabelText("Window Starter participation")).toBeNull();
    expect(screen.queryByLabelText("Window Starter runner")).toBeNull();
  });
});
