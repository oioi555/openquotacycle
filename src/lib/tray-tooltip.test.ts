import { describe, expect, it } from "vitest";
import {
  buildTrayTooltipEntries,
  formatTrayPercentText,
  formatTrayTooltip,
} from "./tray-tooltip";

const METAS = [
  { id: "claude", name: "Claude", iconUrl: "claude.svg", lines: [] },
  { id: "codex", name: "Codex", iconUrl: "codex.svg", lines: [] },
];

const SETTINGS = { order: ["claude", "codex"], disabled: [] as string[] };

function progressLine(used: number, limit: number) {
  return { type: "progress" as const, label: "Session", used, limit };
}

describe("tray-tooltip", () => {
  it("formats fractions as percents", () => {
    expect(formatTrayPercentText(0.5)).toBe("50%");
    expect(formatTrayPercentText(undefined)).toBe("--%");
    expect(formatTrayPercentText(Number.NaN)).toBe("--%");
  });

  it("builds one entry per enabled plugin in settings order", () => {
    const entries = buildTrayTooltipEntries({
      pluginsMeta: METAS,
      pluginSettings: SETTINGS,
      pluginStates: {
        claude: { data: { lines: [progressLine(40, 100)] } },
        codex: { data: null },
      },
    });

    expect(entries).toEqual([
      { name: "Claude", percentText: "60%" },
      { name: "Codex", percentText: "--%" },
    ]);
  });

  it("skips disabled and unknown plugins", () => {
    const entries = buildTrayTooltipEntries({
      pluginsMeta: METAS,
      pluginSettings: { order: ["claude", "codex", "ghost"], disabled: ["codex"] },
      pluginStates: {},
    });

    expect(entries).toEqual([{ name: "Claude", percentText: "--%" }]);
  });

  it("formats the tooltip with the app name first", () => {
    expect(
      formatTrayTooltip([
        { name: "Claude", percentText: "60%" },
        { name: "Codex", percentText: "--%" },
      ]),
    ).toBe("OpenQuotaCycle\nClaude: 60%\nCodex: --%");
    expect(formatTrayTooltip([])).toBe("OpenQuotaCycle");
  });
});
