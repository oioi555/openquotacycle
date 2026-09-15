import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { MetricLine } from "@/lib/plugin-types";
import { FIVE_HOUR_PERIOD_MS } from "@/lib/quota-timeline/axis";
import { leftoverNotifyController } from "./leftover-notify-controller.svelte";

const backendMocks = vi.hoisted(() => ({
  isTauri: vi.fn(() => true),
  showDesktopNotification: vi.fn(async () => {}),
}));

vi.mock("../lib/backend", () => backendMocks);

const NOW = Date.parse("2026-09-15T12:00:00.000Z");
const HOUR = 3_600_000;

function session(used: number, resetsInMs: number): MetricLine {
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

function plugin(lines: MetricLine[]) {
  return {
    meta: { id: "claude", name: "Claude" },
    data: { lines },
    loading: false,
    error: null,
  };
}

describe("leftoverNotifyController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    leftoverNotifyController.resetForTests();
  });

  afterEach(() => {
    leftoverNotifyController.resetForTests();
  });

  it("does not notify the first in-band snapshot", () => {
    leftoverNotifyController.syncInputs(
      {
        plugins: [plugin([session(10, 40 * 60_000)])],
        remainingBandMs: HOUR,
        notifyEnabled: true,
      },
      NOW,
    );

    expect(backendMocks.showDesktopNotification).not.toHaveBeenCalled();
  });

  it("notifies when leftover enters the remaining band", () => {
    leftoverNotifyController.syncInputs(
      {
        plugins: [plugin([session(10, 80 * 60_000)])],
        remainingBandMs: HOUR,
        notifyEnabled: true,
      },
      NOW,
    );
    leftoverNotifyController.evaluate(NOW + 30 * 60_000);

    expect(backendMocks.showDesktopNotification).toHaveBeenCalledTimes(1);
    expect(backendMocks.showDesktopNotification).toHaveBeenCalledWith(
      "Leftover melting",
      expect.stringMatching(/^Claude Session · 90% left · gone in /),
    );
  });

  it("notifies when the remaining band widens", () => {
    leftoverNotifyController.syncInputs(
      {
        plugins: [plugin([session(10, 80 * 60_000)])],
        remainingBandMs: HOUR,
        notifyEnabled: true,
      },
      NOW,
    );
    leftoverNotifyController.syncInputs(
      {
        plugins: [plugin([session(10, 80 * 60_000)])],
        remainingBandMs: 2 * HOUR,
        notifyEnabled: true,
      },
      NOW,
    );

    expect(backendMocks.showDesktopNotification).toHaveBeenCalledTimes(1);
  });

  it("does not notify when Notify is off", () => {
    leftoverNotifyController.syncInputs(
      {
        plugins: [plugin([session(10, 80 * 60_000)])],
        remainingBandMs: HOUR,
        notifyEnabled: false,
      },
      NOW,
    );
    leftoverNotifyController.evaluate(NOW + 30 * 60_000);

    expect(backendMocks.showDesktopNotification).not.toHaveBeenCalled();
  });
});
