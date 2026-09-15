import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PluginDisplayState, PluginOutput } from "@/lib/plugin-types";
import { FIVE_HOUR_PERIOD_MS, WEEKLY_PERIOD_MS } from "@/lib/quota-timeline/axis";
import { appPreferencesController } from "../../controllers/app-preferences-controller.svelte";
import QuotaResetTimeline from "./quota-reset-timeline.svelte";

function stateWithQuota(
  id: string,
  name: string,
  label: string,
  periodDurationMs: number,
  resetsInMs: number,
  used = 40,
): PluginDisplayState {
  const resetsAt = new Date(Date.now() + resetsInMs).toISOString();
  const output: PluginOutput = {
    providerId: id,
    displayName: name,
    plan: "Pro",
    iconUrl: `${id}.svg`,
    lines: [
      {
        type: "progress",
        label,
        used,
        limit: 100,
        format: { kind: "percent" },
        resetsAt,
        periodDurationMs,
      },
    ],
  };
  return {
    meta: {
      id,
      name,
      iconUrl: `${id}.svg`,
      brandColor: "#10a37f",
      lines: [],
    },
    data: output,
    loading: false,
    refreshing: false,
    error: null,
    staleError: null,
    lastManualRefreshAt: null,
  } as unknown as PluginDisplayState;
}

describe("quotaResetTimeline (Svelte)", () => {
  afterEach(() => {
    vi.useRealTimers();
    appPreferencesController.resetState();
  });

  it("renders a five-hour section with a row for an upcoming reset", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));

    render(QuotaResetTimeline, {
      props: { plugins: [stateWithQuota("codex", "Codex", "Five-hour window", FIVE_HOUR_PERIOD_MS, 2 * 60 * 60 * 1000)] },
    });

    expect(screen.getByText("5-hour resets")).toBeTruthy();
    expect(screen.getByText("next 12h")).toBeTruthy();
    expect(screen.getByText("Codex")).toBeTruthy();
    expect(screen.getByText("Five-hour window")).toBeTruthy();
    expect(document.querySelector("[data-slot='timeline-quota-reading']")).toBeNull();
    const nextPlot = document.querySelector("[data-slot='reset-plot'][data-emphasis='next']");
    expect(nextPlot?.getAttribute("data-kind")).toBe("ring");
    expect(nextPlot?.getAttribute("data-percent")).toBe("60");
  });

  it("plots unlabeled dots on a shared meter lane instead of time chips", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));

    render(QuotaResetTimeline, {
      props: { plugins: [stateWithQuota("codex", "Codex", "Five-hour window", FIVE_HOUR_PERIOD_MS, 2 * 60 * 60 * 1000)] },
    });

    const plots = document.querySelectorAll("[data-slot='reset-plot']");
    expect(plots.length).toBe(2);
    expect(plots[0]?.getAttribute("data-emphasis")).toBe("next");
    expect(plots[0]?.getAttribute("data-kind")).toBe("ring");
    expect(plots[1]?.getAttribute("data-emphasis")).toBe("later");
    expect(plots[1]?.getAttribute("data-kind")).toBe("dot");
    expect(document.querySelector("[data-slot='timeline-lane']")?.className).toContain("h-[4px]");
    expect(document.querySelector("[data-slot='timeline-grid']")).toBeTruthy();
    expect(screen.queryByText(/\d{1,2}:\d{2}/)).toBeNull();
    expect(screen.getByLabelText(/Codex · Five-hour window · 60% · resets/)).toBeTruthy();
    expect(screen.getByLabelText(/Codex · Five-hour window · resets/)).toBeTruthy();
    expect(screen.getAllByLabelText(/60%/).length).toBe(1);
    expect(document.querySelector("[data-slot='timeline-quota-reading']")).toBeNull();
    expect(plots[0]?.getAttribute("data-tone")).toBe("normal");
    expect(plots[0]?.getAttribute("data-percent")).toBe("60");
    expect(plots[1]?.getAttribute("data-tone")).toBe("muted");
    expect(plots[0]?.getAttribute("style")).toContain("var(--meter-fill)");
    expect(plots[1]?.getAttribute("style")).toContain("var(--muted-foreground)");
  });

  it("paints exhausted quotas red and follows the used display mode in the tooltip", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));
    appPreferencesController.setDisplayMode("used");

    render(QuotaResetTimeline, {
      props: {
        plugins: [
          stateWithQuota("codex", "Codex", "Five-hour window", FIVE_HOUR_PERIOD_MS, 2 * 60 * 60 * 1000, 90),
        ],
      },
    });

    const plots = document.querySelectorAll("[data-slot='reset-plot']");
    expect(plots[0]?.getAttribute("data-tone")).toBe("critical");
    expect(plots[0]?.getAttribute("data-kind")).toBe("ring");
    expect(plots[0]?.getAttribute("data-percent")).toBe("90");
    expect(plots[0]?.getAttribute("style")).toContain("var(--meter-critical)");
    expect(plots[1]?.getAttribute("data-emphasis")).toBe("later");
    expect(plots[1]?.getAttribute("data-kind")).toBe("dot");
    expect(plots[1]?.getAttribute("data-tone")).toBe("muted");
    expect(plots[1]?.getAttribute("style")).toContain("var(--muted-foreground)");
    expect(screen.getByLabelText(/Codex · Five-hour window · 90% · resets/)).toBeTruthy();
    expect(screen.getAllByLabelText(/90%/).length).toBe(1);
    expect(document.querySelector("[data-slot='timeline-quota-reading']")).toBeNull();
  });

  it("puts an Overview meter on the next-reset tooltip and omits it on later", async () => {
    render(QuotaResetTimeline, {
      props: { plugins: [stateWithQuota("codex", "Codex", "Five-hour window", FIVE_HOUR_PERIOD_MS, 2 * 60 * 60 * 1000)] },
    });

    await fireEvent.pointerEnter(screen.getByLabelText(/Codex · Five-hour window · 60% · resets/));
    await waitFor(() => {
      expect(document.querySelector("[data-slot='timeline-quota-meter'] [role='progressbar']")).toBeTruthy();
    });

    await fireEvent.pointerLeave(screen.getByLabelText(/Codex · Five-hour window · 60% · resets/));
    await fireEvent.pointerEnter(screen.getByLabelText(/Codex · Five-hour window · resets \d/));
    await waitFor(() => {
      expect(document.querySelector("[data-slot='timeline-quota-meter']")).toBeNull();
    });
  });

  it("renders a weekly section with day-axis plots", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-06T12:00:00Z"));

    render(QuotaResetTimeline, {
      props: {
        plugins: [stateWithQuota("claude", "Claude", "Weekly", WEEKLY_PERIOD_MS, 2 * 24 * 60 * 60 * 1000)],
      },
    });

    expect(screen.getByText("Weekly resets")).toBeTruthy();
    expect(screen.getByText("next 14d")).toBeTruthy();
    expect(screen.getByText("Claude")).toBeTruthy();
    expect(document.querySelectorAll("[data-slot='reset-plot']").length).toBe(2);
  });

  it("renders nothing when no provider exposes timeline quotas", () => {
    render(QuotaResetTimeline, { props: { plugins: [] } });
    expect(screen.queryByLabelText("Quota reset timeline")).toBeNull();
  });
});
