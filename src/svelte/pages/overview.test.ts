import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginOutput } from "@/lib/plugin-types";
import { FIVE_HOUR_PERIOD_MS, WEEKLY_PERIOD_MS } from "@/lib/quota-timeline/axis";
import { appUiController } from "../controllers/app-ui-controller.svelte";
import type { DisplayPluginState } from "../controllers/plugin-views.svelte";
import OverviewPage from "./overview.svelte";

function plugin(
  id: string,
  name: string,
  lines: PluginOutput["lines"],
): DisplayPluginState {
  return {
    meta: { id, name, iconUrl: `${id}.svg`, brandColor: "#10a37f", lines: [] },
    data: { providerId: id, displayName: name, iconUrl: `${id}.svg`, lines },
    loading: false,
    refreshing: false,
    error: null,
    staleError: null,
    lastManualRefreshAt: null,
    lastUpdatedAt: null,
  };
}

function progress(label: string, resetsInMs: number, periodDurationMs: number) {
  return {
    type: "progress" as const,
    label,
    used: 40,
    limit: 100,
    format: { kind: "percent" as const },
    resetsAt: new Date(Date.now() + resetsInMs).toISOString(),
    periodDurationMs,
  };
}

const plugins = [
  plugin("claude", "Claude", [
    progress("Session", 59 * 60_000, FIVE_HOUR_PERIOD_MS),
    progress("Weekly", 2 * 24 * 60 * 60_000, WEEKLY_PERIOD_MS),
  ]),
];

function renderOverview(timelineCardVisible = true) {
  return render(OverviewPage, {
    props: {
      plugins,
      displayMode: "left",
      resetTimerDisplayMode: "relative",
      timelineCardVisible,
    },
  });
}

describe("overview dashboard", () => {
  afterEach(() => {
    appUiController.resetState();
  });

  it("shows the Timeline card with per-provider remaining times", () => {
    renderOverview();

    const card = screen.getByRole("button", { name: "Timeline" }).parentElement;
    expect(card?.textContent).toContain("5-hour");
    expect(card?.textContent).toContain("Weekly");
    expect(screen.queryByText(/Next reset in/)).toBeNull();
  });

  it("hides the Timeline card when visibility is off", () => {
    renderOverview(false);

    expect(screen.queryByRole("button", { name: "Timeline" })).toBeNull();
    expect(screen.queryByText("5-hour")).toBeNull();
  });

  it("opens the Timeline screen from the card", async () => {
    renderOverview();
    await fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(appUiController.screen).toBe("timeline");
  });

  it("opens Timeline customize from the card context menu", async () => {
    renderOverview();
    await fireEvent.contextMenu(screen.getByRole("button", { name: "Timeline" }));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Customize…" }));
    expect(appUiController.screen).toBe("customize:timeline");
  });

  it("does not render a Cost teaser or sample-data marker", () => {
    renderOverview();

    expect(screen.queryByText(/sample data/i)).toBeNull();
    expect(screen.queryByText("Tokens")).toBeNull();
    expect(screen.queryByRole("button", { name: "Cost" })).toBeNull();
  });
});

describe("overview Start agy", () => {
  afterEach(() => {
    appUiController.resetState();
  });

  function staleAntigravity(): DisplayPluginState {
    return {
      meta: {
        id: "antigravity",
        name: "Antigravity",
        iconUrl: "antigravity.svg",
        brandColor: "#000000",
        lines: [],
      },
      data: {
        providerId: "antigravity",
        displayName: "Antigravity",
        iconUrl: "antigravity.svg",
        lines: [],
        statuses: [{ text: "Stale", tone: "warning" }],
      },
      loading: false,
      refreshing: false,
      error: null,
      staleError: null,
      lastManualRefreshAt: null,
      lastUpdatedAt: Date.now(),
    };
  }

  it("shows Start agy on Stale when auto is off and agy is on PATH", async () => {
    const onStartAgy = vi.fn();
    render(OverviewPage, {
      props: {
        plugins: [staleAntigravity()],
        displayMode: "left",
        resetTimerDisplayMode: "relative",
        agyAvailable: true,
        antigravityAgyAutoWake: false,
        onStartAgy,
      },
    });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Antigravity session expired. Start Antigravity or agy and try again.");
    await fireEvent.click(screen.getByRole("button", { name: "Start agy" }));
    expect(onStartAgy).toHaveBeenCalledWith("antigravity");
  });

  it("hides Start agy when agy is missing", () => {
    render(OverviewPage, {
      props: {
        plugins: [staleAntigravity()],
        displayMode: "left",
        resetTimerDisplayMode: "relative",
        agyAvailable: false,
        antigravityAgyAutoWake: false,
      },
    });
    expect(screen.queryByRole("button", { name: "Start agy" })).toBeNull();
  });

  function grokCredentialPlugin(): DisplayPluginState {
    return {
      meta: {
        id: "grok",
        name: "Grok",
        iconUrl: "grok.svg",
        brandColor: "#000000",
        lines: [],
      },
      data: null,
      loading: false,
      refreshing: false,
      error: "Grok session expired. Start Grok Build and try again.",
      staleError: null,
      lastManualRefreshAt: null,
      lastUpdatedAt: null,
    };
  }

  function grokNetworkStalePlugin(): DisplayPluginState {
    return {
      meta: {
        id: "grok",
        name: "Grok",
        iconUrl: "grok.svg",
        brandColor: "#000000",
        lines: [],
      },
      data: {
        providerId: "grok",
        displayName: "Grok",
        iconUrl: "grok.svg",
        lines: [],
        statuses: [{ text: "Stale", tone: "warning" }],
      },
      loading: false,
      refreshing: false,
      error: null,
      staleError: "Usage request failed. Check your connection.",
      lastManualRefreshAt: null,
      lastUpdatedAt: Date.now(),
    };
  }

  it("shows Start grok on credential error when grok is available, including while auto is on", async () => {
    const onStartAgy = vi.fn();
    render(OverviewPage, {
      props: {
        plugins: [grokCredentialPlugin()],
        displayMode: "left",
        resetTimerDisplayMode: "relative",
        grokAvailable: true,
        grokAutoWake: true,
        onStartAgy,
      },
    });
    await fireEvent.click(screen.getByRole("button", { name: "Start grok" }));
    expect(onStartAgy).toHaveBeenCalledWith("grok");
  });

  it("hides Start grok when the CLI is missing", () => {
    render(OverviewPage, {
      props: {
        plugins: [grokCredentialPlugin()],
        displayMode: "left",
        resetTimerDisplayMode: "relative",
        grokAvailable: false,
      },
    });
    expect(screen.queryByRole("button", { name: "Start grok" })).toBeNull();
  });

  it("does not show Start grok on network stale", () => {
    render(OverviewPage, {
      props: {
        plugins: [grokNetworkStalePlugin()],
        displayMode: "left",
        resetTimerDisplayMode: "relative",
        grokAvailable: true,
        grokAutoWake: true,
      },
    });
    expect(screen.queryByRole("button", { name: "Start grok" })).toBeNull();
  });
});
