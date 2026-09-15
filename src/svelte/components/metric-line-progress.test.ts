import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import MetricLineProgress from "./metric-line-progress.svelte";
import type { MetricLine } from "@/lib/plugin-types";
import { FIVE_HOUR_PERIOD_MS } from "@/lib/quota-timeline/axis";

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-09-07T00:00:00Z");

function progressLine(used: number, resetsInMs: number): Extract<MetricLine, { type: "progress" }> {
  return {
    type: "progress",
    label: "Weekly",
    used,
    limit: 100,
    format: { kind: "percent" },
    resetsAt: new Date(NOW + resetsInMs).toISOString(),
    periodDurationMs: 7 * DAY,
  };
}

function fillColor(container: HTMLElement): string | null {
  return container.querySelector('[role="progressbar"] > div')?.getAttribute("style") ?? null;
}

function paceMarker(container: HTMLElement): Element | null {
  return container.querySelector('[data-slot="progress-marker"]');
}

describe("metric-line-progress verdicts", () => {
  it("renders brand green when comfortably on pace", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(10, 3.5 * DAY), displayMode: "left", now: NOW },
    });
    expect(fillColor(container)).toContain("var(--meter-fill)");
  });

  it("renders yellow when under 10% spare", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(50, 3.5 * DAY), displayMode: "left", now: NOW },
    });
    expect(fillColor(container)).toContain("var(--meter-warning)");
  });

  it("renders red when projected to run out", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(90, 6 * DAY), displayMode: "left", now: NOW },
    });
    expect(fillColor(container)).toContain("var(--meter-critical)");
  });

  it("renders red when the limit is reached", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(100, 2 * DAY), displayMode: "left", now: NOW },
    });
    expect(fillColor(container)).toContain("var(--meter-critical)");
  });
});

describe("metric-line-progress elapsed-time tick", () => {
  it("renders the now tick when on-track", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(45, 3.5 * DAY), displayMode: "left", now: NOW },
    });
    expect(paceMarker(container)).not.toBeNull();
  });

  it("renders the now tick before pace status is available", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(10, 6.86 * DAY), displayMode: "left", now: NOW },
    });
    expect(paceMarker(container)).not.toBeNull();
  });

  it("renders the now tick on an unused left-mode bar", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(0, 3.5 * DAY), displayMode: "left", now: NOW },
    });
    expect(paceMarker(container)).not.toBeNull();
  });

  it("omits the now tick without a period duration", () => {
    const line = progressLine(45, 3.5 * DAY);
    delete line.periodDurationMs;
    const { container } = render(MetricLineProgress, {
      props: { line, displayMode: "left", now: NOW },
    });
    expect(paceMarker(container)).toBeNull();
  });
});

function behindLine(): Extract<MetricLine, { type: "progress" }> {
  return {
    type: "progress",
    label: "Weekly",
    used: 60,
    limit: 100,
    format: { kind: "percent" },
    resetsAt: new Date(NOW + 12 * HOUR).toISOString(),
    periodDurationMs: DAY,
  };
}

describe("metric-line-progress two-row layout", () => {
  it("puts the suffix-free reading next to the label and the meter alone on row 2", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(10, 3.5 * DAY), displayMode: "left", now: NOW },
    });
    const label = screen.getByText("Weekly");
    const reading = screen.getByText("90%");
    const bar = container.querySelector('[role="progressbar"]');
    expect(screen.queryByText(/left/)).toBeNull();
    expect(reading.parentElement).toBe(label.parentElement);
    expect(bar?.parentElement).not.toBe(label.parentElement);
    expect(bar?.parentElement?.className.split(/\s+/)).toContain("pb-2");
    expect(bar?.parentElement?.querySelector("[data-slot='progress-reading']")).toBeNull();
  });

  it("shows the used amount without a used/left suffix", () => {
    render(MetricLineProgress, {
      props: { line: progressLine(10, 3.5 * DAY), displayMode: "used", now: NOW },
    });
    expect(screen.getByText("10%")).not.toBeNull();
    expect(screen.queryByText("10% left")).toBeNull();
    expect(screen.queryByText("10% used")).toBeNull();
  });

  it("keeps the used/left toggle on the reading next to the label", async () => {
    const onDisplayModeToggle = vi.fn();
    render(MetricLineProgress, {
      props: {
        line: progressLine(10, 3.5 * DAY),
        displayMode: "left",
        now: NOW,
        onDisplayModeToggle,
      },
    });
    const toggle = screen.getByTitle("Toggle used / left");
    expect(toggle.textContent).toBe("90%");
    expect(toggle.className).toContain("ui-pressable");
    expect(toggle.getAttribute("data-slot")).toBe("progress-reading");
    expect(toggle.className.split(/\s+/)).toContain("text-muted-foreground");
    await fireEvent.click(toggle);
    expect(onDisplayModeToggle).toHaveBeenCalledTimes(1);
  });
});

describe("metric-line-progress reset chip", () => {
  it("shows a compact relative face without the English prefix", async () => {
    const onResetTimerDisplayModeToggle = vi.fn();
    const nowMs = Date.parse("2026-02-03T11:29:00.000Z");
    const line: Extract<MetricLine, { type: "progress" }> = {
      type: "progress",
      label: "Weekly",
      used: 10,
      limit: 100,
      format: { kind: "percent" },
      resetsAt: "2026-02-03T12:34:00.000Z",
      periodDurationMs: 5 * HOUR,
    };
    render(MetricLineProgress, {
      props: {
        line,
        displayMode: "left",
        now: nowMs,
        resetTimerDisplayMode: "relative",
        onResetTimerDisplayModeToggle,
      },
    });
    const chip = screen.getByRole("button", { name: /Resets in 1h 5m/ });
    expect(chip.getAttribute("data-slot")).toBe("reset-chip");
    expect(chip.textContent).toContain("1h 5m");
    expect(chip.textContent).not.toMatch(/Resets/);
    expect(chip.className.split(/\s+/)).toContain("text-muted-foreground");
    expect(chip.className.split(/\s+/)).not.toContain("text-foreground");
    expect(chip.querySelector(".lucide-timer")).not.toBeNull();
    await fireEvent.click(chip);
    expect(onResetTimerDisplayModeToggle).toHaveBeenCalledTimes(1);
  });

  it("shows a compact absolute face without Resets/today/tomorrow", () => {
    const nowMs = new Date(2026, 1, 3, 0, 0, 0).getTime();
    const resetsAtIso = new Date(2026, 1, 3, 12, 34, 0).toISOString();
    const timeText = new Intl.DateTimeFormat(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }).format(Date.parse(resetsAtIso));
    const line: Extract<MetricLine, { type: "progress" }> = {
      type: "progress",
      label: "Weekly",
      used: 10,
      limit: 100,
      format: { kind: "percent" },
      resetsAt: resetsAtIso,
      periodDurationMs: 5 * HOUR,
    };
    render(MetricLineProgress, {
      props: {
        line,
        displayMode: "left",
        now: nowMs,
        resetTimerDisplayMode: "absolute",
        onResetTimerDisplayModeToggle: vi.fn(),
      },
    });
    const chip = screen.getByRole("button", { name: new RegExp(`Resets today at ${timeText}`) });
    expect(chip.textContent).toContain(timeText);
    expect(chip.textContent).not.toMatch(/Resets|today|tomorrow/);
  });

  it("shows Not started without a timer icon for an unstarted 5h window", () => {
    const line: Extract<MetricLine, { type: "progress" }> = {
      type: "progress",
      label: "Session",
      used: 0,
      limit: 100,
      format: { kind: "percent" },
      periodDurationMs: 5 * HOUR,
    };
    const { container } = render(MetricLineProgress, {
      props: { line, displayMode: "left", now: NOW },
    });
    const chip = container.querySelector('[data-slot="reset-chip"]');
    expect(chip?.textContent).toBe("Not started");
    expect(chip?.querySelector(".lucide-timer")).toBeNull();
  });

  it("shows a live 5h countdown at 0% used", () => {
    const line: Extract<MetricLine, { type: "progress" }> = {
      type: "progress",
      label: "Session",
      used: 0,
      limit: 100,
      format: { kind: "percent" },
      resetsAt: new Date(NOW + 65 * 60 * 1000).toISOString(),
      periodDurationMs: 5 * HOUR,
    };
    const { container } = render(MetricLineProgress, {
      props: { line, displayMode: "left", now: NOW },
    });
    const chip = container.querySelector('[data-slot="reset-chip"]');
    expect(chip?.textContent).toContain("1h 5m");
    expect(chip?.textContent).not.toContain("Not started");
    expect(chip?.querySelector(".lucide-timer")).not.toBeNull();
  });
});

describe("metric-line-progress run-out chip", () => {
  it("shows Flame plus compact ETA only when behind, not in the heading", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: behindLine(), displayMode: "left", now: NOW },
    });
    const chip = screen.getByRole("button", { name: "Runs out in 8h 0m" });
    expect(chip.getAttribute("data-slot")).toBe("run-out-chip");
    expect(chip.textContent).toContain("8h 0m");
    expect(chip.textContent).not.toMatch(/Runs out/);
    expect(chip.className).toContain("text-muted-foreground");
    expect(chip.querySelector(".lucide-flame")).not.toBeNull();
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.parentElement?.textContent).not.toMatch(/Runs out/);
    expect(container.textContent).not.toContain("Runs out in");
  });

  it("shows Flame only when the limit is reached", () => {
    render(MetricLineProgress, {
      props: { line: progressLine(100, 2 * DAY), displayMode: "left", now: NOW },
    });
    const chip = screen.getByRole("button", { name: "Limit reached" });
    expect(chip.getAttribute("data-slot")).toBe("run-out-chip");
    expect(chip.querySelector(".lucide-flame")).not.toBeNull();
    expect(chip.textContent?.replace(/\s+/g, "")).toBe("");
    expect(screen.queryByText("Limit reached")).toBeNull();
  });

  it("omits the run-out chip when comfortably on pace", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(10, 3.5 * DAY), displayMode: "left", now: NOW },
    });
    expect(container.querySelector('[data-slot="run-out-chip"]')).toBeNull();
    expect(screen.queryByRole("button", { name: /Runs out|Limit reached/ })).toBeNull();
  });
});

describe("metric-line-progress crossing-go tick", () => {
  function sessionLine(
    used: number,
    resetsInMs: number,
  ): Extract<MetricLine, { type: "progress" }> {
    return {
      type: "progress",
      label: "Session",
      used,
      limit: 100,
      format: { kind: "percent" },
      resetsAt: new Date(NOW + resetsInMs).toISOString(),
      periodDurationMs: FIVE_HOUR_PERIOD_MS,
    };
  }

  it("emphasizes the tick when the 5-hour line is crossing-go", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: sessionLine(10, 40 * 60_000), displayMode: "used", now: NOW },
    });
    const marker = paceMarker(container);
    expect(marker?.getAttribute("data-crossing-go")).toBe("true");
    expect(marker?.className).toContain("bg-meter-fill");
    expect(marker?.className).not.toContain("meter-go-tick");
    expect(marker?.className).not.toContain("shadow-");
    expect(marker?.className).toContain("h-[16px]");
  });

  it("keeps a muted tick when the 5-hour line is not crossing-go", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: sessionLine(0, 4 * HOUR), displayMode: "used", now: NOW },
    });
    const marker = paceMarker(container);
    expect(marker?.getAttribute("data-crossing-go")).toBeNull();
    expect(marker?.className).toContain("bg-foreground");
  });

  it("keeps a muted tick on weekly meters", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(10, 3.5 * DAY), displayMode: "used", now: NOW },
    });
    expect(paceMarker(container)?.getAttribute("data-crossing-go")).toBeNull();
  });
});

describe("metric-line-progress headroom hatch", () => {
  function sessionLine(
    used: number,
    resetsInMs: number,
  ): Extract<MetricLine, { type: "progress" }> {
    return {
      type: "progress",
      label: "Session",
      used,
      limit: 100,
      format: { kind: "percent" },
      resetsAt: new Date(NOW + resetsInMs).toISOString(),
      periodDurationMs: FIVE_HOUR_PERIOD_MS,
    };
  }

  it("shades leftover and names cross-the-reset in the last hour", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: sessionLine(0, HOUR), displayMode: "used", now: NOW },
    });
    const zone = container.querySelector("[data-slot='progress-headroom']") as HTMLElement;
    expect(zone.style.left).toBe("0%");
    expect(zone.style.width).toBe("100%");
    expect(zone.getAttribute("data-crossing-go")).toBe("true");
    expect(zone.className).toContain("meter-headroom-hatch-go");
    expect(zone.className).not.toContain("bg-meter-warning");
    expect(
      screen.getByRole("button", { name: /80% ahead of pace · melts at reset/ }),
    ).toBeTruthy();
  });

  it("shades fill to the pace tick when ahead earlier in the window", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: sessionLine(0, 4 * HOUR), displayMode: "used", now: NOW },
    });
    const zone = container.querySelector("[data-slot='progress-headroom']") as HTMLElement;
    expect(zone.style.left).toBe("0%");
    expect(zone.style.width).toBe("20%");
    expect(zone.getAttribute("data-crossing-go")).toBeNull();
    expect(zone.className).toContain("meter-headroom-hatch");
    expect(zone.className).not.toContain("meter-headroom-hatch-go");
    expect(screen.getByRole("button", { name: /20% ahead of pace/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /melts at reset/ })).toBeNull();
  });

  it("melts leftover past the tick to a hatch in left mode", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: sessionLine(0, 4 * HOUR), displayMode: "left", now: NOW },
    });
    const bar = container.querySelector('[role="progressbar"]');
    const fill = bar?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("80%");
    const zone = container.querySelector("[data-slot='progress-headroom']") as HTMLElement;
    expect(zone.style.left).toBe("80%");
    expect(zone.style.width).toBe("20%");
    expect(zone.getAttribute("data-crossing-go")).toBeNull();
    expect(zone.className).toContain("meter-headroom-hatch");
    expect(zone.className).not.toContain("bg-meter-fill");
    expect(zone.className).not.toContain("bg-meter-warning");
  });

  it("melts leftover to a last-hour hatch in left mode", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: sessionLine(0, HOUR), displayMode: "left", now: NOW },
    });
    const bar = container.querySelector('[role="progressbar"]');
    const fill = bar?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("0%");
    const zone = container.querySelector("[data-slot='progress-headroom']") as HTMLElement;
    expect(zone.style.left).toBe("0%");
    expect(zone.style.width).toBe("100%");
    expect(zone.getAttribute("data-crossing-go")).toBe("true");
    expect(zone.className).toContain("meter-headroom-hatch-go");
    expect(zone.className).not.toContain("bg-meter-warning");
  });

  it("hatches leftover on weekly meters without cross-the-reset", () => {
    const { container } = render(MetricLineProgress, {
      props: { line: progressLine(0, 3.5 * DAY), displayMode: "left", now: NOW },
    });
    const bar = container.querySelector('[role="progressbar"]');
    const fill = bar?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("50%");
    const zone = container.querySelector("[data-slot='progress-headroom']") as HTMLElement;
    expect(zone.style.left).toBe("50%");
    expect(zone.style.width).toBe("50%");
    expect(zone.getAttribute("data-crossing-go")).toBeNull();
    expect(zone.className).toContain("meter-headroom-hatch");
    expect(zone.className).not.toContain("meter-headroom-hatch-go");
    expect(screen.getByRole("button", { name: /50% ahead of pace/ })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /melts at reset/ })).toBeNull();
  });
});
