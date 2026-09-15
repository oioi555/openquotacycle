import { describe, expect, it } from "vitest";
import { findNextReset, formatResetIn } from "./next-reset";

const NOW = Date.parse("2026-09-06T12:00:00Z");
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

function progressLine(resetsAt: string | null, periodDurationMs?: number) {
  return {
    type: "progress" as const,
    label: "Session",
    used: 1,
    limit: 100,
    format: { kind: "percent" as const },
    resetsAt: resetsAt ?? undefined,
    periodDurationMs,
  };
}

describe("findNextReset", () => {
  it("returns the nearest future reset across providers", () => {
    const next = findNextReset(
      [
        { data: { lines: [progressLine(new Date(NOW + 5 * HOUR).toISOString())] } },
        { data: { lines: [progressLine(new Date(NOW + 2 * HOUR).toISOString())] } },
      ],
      NOW,
    );
    expect(next).toBe(NOW + 2 * HOUR);
  });

  it("advances past resets by their period until strictly after now", () => {
    const next = findNextReset(
      [{ data: { lines: [progressLine(new Date(NOW - HOUR).toISOString(), 5 * HOUR)] } }],
      NOW,
    );
    expect(next).toBe(NOW + 4 * HOUR);
  });

  it("skips past resets without a period and malformed or missing timestamps", () => {
    const next = findNextReset(
      [
        { data: { lines: [progressLine(new Date(NOW - HOUR).toISOString())] } },
        { data: { lines: [progressLine("not-a-date")] } },
        { data: { lines: [progressLine(null)] } },
        { data: null },
      ],
      NOW,
    );
    expect(next).toBeNull();
  });

  it("ignores text lines", () => {
    const next = findNextReset(
      [
        {
          data: {
            lines: [
              { type: "text" as const, label: "Tokens", value: "1.2k", resetsAt: new Date(NOW + HOUR).toISOString() },
            ],
          },
        },
      ],
      NOW,
    );
    expect(next).toBeNull();
  });
});

describe("formatResetIn", () => {
  it("formats remaining time from a reset instant", () => {
    expect(formatResetIn(NOW + 2 * HOUR + 14 * 60_000, NOW)).toBe("2h 14m");
    expect(formatResetIn(NOW + 3 * DAY, NOW)).toBe("3d 0h");
    expect(formatResetIn(NOW + 5 * 60_000, NOW)).toBe("5m");
    expect(formatResetIn(NOW, NOW)).toBe("0m");
  });
});
