import { describe, expect, it } from "vitest";
import { formatAutoRefreshCountdown } from "./auto-refresh-countdown";

const NOW = Date.parse("2026-09-13T12:00:00Z");

describe("formatAutoRefreshCountdown", () => {
  it("shows Off when paused", () => {
    expect(formatAutoRefreshCountdown(null, NOW)).toEqual({
      face: "Off",
      label: "Auto refresh paused",
    });
  });

  it("rounds 90 seconds up to 2m without a Next update in prefix on the face", () => {
    expect(formatAutoRefreshCountdown(NOW + 90_000, NOW)).toEqual({
      face: "2m",
      label: "Next update in 2m",
    });
  });

  it("uses seconds under one minute", () => {
    expect(formatAutoRefreshCountdown(NOW + 12_000, NOW)).toEqual({
      face: "12s",
      label: "Next update in 12s",
    });
  });
});
