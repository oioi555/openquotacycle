import { fireEvent, render, screen } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginDisplayState, PluginOutput } from "@/lib/plugin-types";
import { FIVE_HOUR_PERIOD_MS, WEEKLY_PERIOD_MS } from "@/lib/quota-timeline/axis";
import { appUiController } from "../controllers/app-ui-controller.svelte";
import TimelineCard from "./timeline-card.svelte";

const NOW = Date.parse("2026-09-06T12:00:00.000Z");

function plugin(
  id: string,
  name: string,
  lines: PluginOutput["lines"],
): PluginDisplayState {
  return {
    meta: { id, name, iconUrl: `${id}.svg`, brandColor: "#10a37f", lines: [] },
    data: { providerId: id, displayName: name, iconUrl: `${id}.svg`, lines },
    loading: false,
    error: null,
    lastManualRefreshAt: null,
  };
}

function progress(label: string, resetsInMs: number, periodDurationMs: number) {
  return {
    type: "progress" as const,
    label,
    used: 40,
    limit: 100,
    format: { kind: "percent" as const },
    resetsAt: new Date(NOW + resetsInMs).toISOString(),
    periodDurationMs,
  };
}

describe("timelineCard", () => {
  afterEach(() => {
    appUiController.resetState();
  });

  it("lists five-hour and weekly remaining times with provider names in tooltips", () => {
    render(TimelineCard, {
      props: {
        now: NOW,
        plugins: [
          plugin("claude", "Claude", [
            progress("Session", 59 * 60_000, FIVE_HOUR_PERIOD_MS),
            progress("Weekly", 2 * 24 * 60 * 60_000 + 5 * 60 * 60_000, WEEKLY_PERIOD_MS),
          ]),
          plugin("codex", "Codex", [
            progress("Session", 2 * 60 * 60_000 + 12 * 60_000, FIVE_HOUR_PERIOD_MS),
          ]),
        ],
      },
    });

    expect(screen.getByRole("button", { name: "Timeline" })).toBeTruthy();
    expect(screen.getByText("5-hour")).toBeTruthy();
    expect(screen.getByText("Weekly")).toBeTruthy();
    expect(screen.getByText("59m")).toBeTruthy();
    expect(screen.getByText("2h 12m")).toBeTruthy();
    expect(screen.getByText("2d 5h")).toBeTruthy();
    expect(screen.getByLabelText(/Claude · Session/)).toBeTruthy();
    expect(screen.getByLabelText(/Codex · Session/)).toBeTruthy();
    expect(screen.getByLabelText(/Claude · Weekly/)).toBeTruthy();
    expect(screen.getByLabelText(/40% ahead of pace · melts at reset/)).toBeTruthy();
    expect(screen.getByLabelText(/Claude · Weekly/).getAttribute("aria-label")).not.toMatch(
      /ahead of pace/,
    );
    expect(screen.getByLabelText(/Claude · Session/).getAttribute("title")).toBeNull();

    const itemRows = document.querySelectorAll("[data-slot='timeline-cadence-items']");
    expect(itemRows.length).toBe(2);
    for (const row of itemRows) {
      expect(row.className).toContain("overflow-x-auto");
      expect(row.className).toContain("flex-nowrap");
      expect(row.className).not.toContain("flex-wrap");
    }
    const card = document.querySelector(".ui-card");
    expect(card?.className).toContain("pt-[15px]");
    expect(card?.className).toContain("pb-[15px]");
    expect(card?.className).toContain("ui-pressable");
    expect(card?.className).toContain("hover:bg-card-hover");
    expect(document.querySelector("[data-slot='card-expand-slot']")).toBeNull();
    expect(document.querySelector("[data-slot='card-expand-spacer']")).toBeNull();
  });

  it("drags a cadence row horizontally without navigating", async () => {
    render(TimelineCard, {
      props: {
        now: NOW,
        plugins: [
          plugin("claude", "Claude", [
            progress("Session", 59 * 60_000, FIVE_HOUR_PERIOD_MS),
          ]),
        ],
      },
    });

    const row = document.querySelector("[data-slot='timeline-cadence-items']") as HTMLElement;
    expect(row).toBeTruthy();
    Object.defineProperty(row, "scrollWidth", { configurable: true, get: () => 400 });
    Object.defineProperty(row, "clientWidth", { configurable: true, get: () => 200 });
    row.scrollLeft = 0;

    await fireEvent.pointerDown(row, { pointerId: 1, button: 0, clientX: 120 });
    await fireEvent.pointerMove(row, { pointerId: 1, clientX: 40 });
    expect(row.scrollLeft).toBe(80);
    await fireEvent.pointerUp(row, { pointerId: 1, button: 0, clientX: 40 });
    await fireEvent.click(row);

    expect(appUiController.screen).toBe("dashboard");
  });

  it("navigates to the timeline screen", async () => {
    render(TimelineCard, { props: { now: NOW, plugins: [] } });
    await fireEvent.click(screen.getByRole("button", { name: "Timeline" }));
    expect(appUiController.screen).toBe("timeline");
  });

  it("shows an empty state when no supported resets exist", () => {
    render(TimelineCard, { props: { now: NOW, plugins: [] } });
    expect(screen.getByText("No upcoming resets")).toBeTruthy();
  });

  it("hides cadence rows that are turned off", () => {
    render(TimelineCard, {
      props: {
        now: NOW,
        visibleRows: ["weekly"],
        plugins: [
          plugin("claude", "Claude", [
            progress("Session", 59 * 60_000, FIVE_HOUR_PERIOD_MS),
            progress("Weekly", 2 * 24 * 60 * 60_000 + 5 * 60 * 60_000, WEEKLY_PERIOD_MS),
          ]),
        ],
      },
    });

    expect(screen.queryByText("5-hour")).toBeNull();
    expect(screen.getByText("Weekly")).toBeTruthy();
    expect(screen.getByText("2d 5h")).toBeTruthy();
  });

  it("opens Customize Timeline from the context menu", async () => {
    render(TimelineCard, { props: { now: NOW, plugins: [] } });
    await fireEvent.contextMenu(screen.getByRole("button", { name: "Timeline" }));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Customize…" }));
    expect(appUiController.screen).toBe("customize:timeline");
  });

  it("hides the card from the context menu", async () => {
    const onHide = vi.fn();
    render(TimelineCard, { props: { now: NOW, plugins: [], onHide } });
    await fireEvent.contextMenu(screen.getByRole("button", { name: "Timeline" }));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Hide Timeline" }));
    expect(onHide).toHaveBeenCalledTimes(1);
  });

  it("leads the 5-hour row with crossing-go remaining time in meter fill", () => {
    render(TimelineCard, {
      props: {
        now: NOW,
        plugins: [
          plugin("claude", "Claude", [
            {
              type: "progress",
              label: "Session",
              used: 100,
              limit: 100,
              format: { kind: "percent" },
              resetsAt: new Date(NOW + 30 * 60_000).toISOString(),
              periodDurationMs: FIVE_HOUR_PERIOD_MS,
            },
          ]),
          plugin("zai", "Z.ai", [
            progress("Session", 50 * 60_000, FIVE_HOUR_PERIOD_MS),
          ]),
        ],
      },
    });

    const row = document.querySelector("[data-slot='timeline-cadence-items']");
    const faces = [...(row?.querySelectorAll("span.tabular-nums") ?? [])].map(
      (node) => node.textContent,
    );
    expect(faces[0]).toBe("50m");
    const go = row?.querySelector("[data-crossing-go='true']");
    expect(go?.textContent).toContain("50m");
    expect(go?.className).toContain("bg-meter-fill/20");
    expect(go?.className).toContain("rounded-full");
    expect(screen.getByLabelText(/Z.ai · Session/)).toBeTruthy();
  });
});
