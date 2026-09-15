import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import WindowStarterPage from "./window-starter.svelte";
import type { WindowStarterAttempt } from "@/lib/window-starter";
import { formatWindowStarterClock, type WindowStarterProviderView } from "@/lib/window-starter-state";

const providers: WindowStarterProviderView[] = [
  {
    pluginId: "claude",
    windowId: "session",
    windowLine: "Session",
    runnerId: "claude",
    name: "Claude",
    executable: "claude",
    cliAvailable: true,
    participationEnabled: true,
    status: "ready",
  },
  {
    pluginId: "antigravity",
    windowId: "session",
    windowLine: "Session",
    runnerId: "agy",
    name: "Antigravity",
    executable: "agy",
    cliAvailable: true,
    participationEnabled: false,
    status: "off",
  },
  {
    pluginId: "antigravity",
    windowId: "claude",
    windowLine: "Claude",
    runnerId: "agy",
    name: "Antigravity",
    executable: "agy",
    cliAvailable: false,
    participationEnabled: true,
    status: "cli-missing",
  },
];

const attempts: WindowStarterAttempt[] = [
  {
    id: "a1",
    providerId: "antigravity",
    windowLine: "Claude",
    runnerId: "agy",
    startedAt: "2026-09-06T00:00:00.000Z",
    status: "failed",
    command: "agy -p <prompt> --model claude-sonnet-4-6",
  },
];

function renderPage(
  overrides: {
    enabled?: boolean;
    attempts?: WindowStarterAttempt[];
    onEnabledChange?: (enabled: boolean) => void;
    onWindowParticipation?: (pluginId: string, windowId: string, enabled: boolean) => void;
    onCustomize?: (pluginId: string) => void;
    onManualRun?: (provider: WindowStarterProviderView) => void;
  } = {},
) {
  return render(WindowStarterPage, {
    props: {
      enabled: overrides.enabled ?? true,
      historyReady: true,
      providers,
      attempts: overrides.attempts ?? attempts,
      onEnabledChange: overrides.onEnabledChange ?? vi.fn(),
      onWindowParticipation: overrides.onWindowParticipation,
      onCustomize: overrides.onCustomize,
      onManualRun: overrides.onManualRun,
    },
  });
}

describe("windowStarter page", () => {
  it("groups windows onto provider cards with status and no runner subtitle", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Window Starter" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Claude" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Antigravity" })).toBeTruthy();
    expect(screen.getByLabelText("Claude · Session")).toBeTruthy();
    expect(screen.getByLabelText("Antigravity · Session")).toBeTruthy();
    expect(screen.getByLabelText("Antigravity · Claude")).toBeTruthy();
    expect(screen.queryByText("Claude · Session")).toBeNull();
    expect(screen.queryByText("Claude Code")).toBeNull();
    const claudeRow = screen.getByLabelText("Claude · Session");
    expect(claudeRow.textContent).not.toContain("Claude Code");
    const agClaude = screen.getByLabelText("Antigravity · Claude");
    expect(agClaude.querySelector('[aria-label="failed"]')).toBeTruthy();
    expect(agClaude.textContent).toContain(formatWindowStarterClock("2026-09-06T00:00:00.000Z"));
    expect(agClaude.textContent).not.toContain("agy");
    expect(screen.queryByText(/agy not found/)).toBeNull();
    expect(screen.queryByLabelText("Window Starter runner")).toBeNull();
    expect(screen.getByText("Off")).toBeTruthy();
    expect(screen.getByText("CLI missing")).toBeTruthy();
    expect(screen.queryByText("Activity")).toBeNull();
    expect(screen.queryByText("1 / 500")).toBeNull();
  });

  it("shows the global switch inside a compact Auto-start card", () => {
    renderPage({ enabled: false });

    expect(screen.getByText("Auto-start")).toBeTruthy();
    expect(screen.getByText("Starts idle 5-hour windows.")).toBeTruthy();
    const toggle = screen.getByRole("switch", { name: "Auto-start" });
    expect(toggle.getAttribute("role")).toBe("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByRole("button", { name: "On" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Off" })).toBeNull();
    expect(toggle.closest(".ui-card")).toBeTruthy();
  });

  it("shows at most five logs on an expanded card with window titles", async () => {
    const manyAttempts: WindowStarterAttempt[] = Array.from({ length: 6 }, (_, index) => ({
      id: `a${index}`,
      providerId: "antigravity",
      windowLine: index % 2 === 0 ? "Session" : "Claude",
      runnerId: "agy",
      startedAt: `2026-09-0${index + 1}T00:00:00.000Z`,
      status: "failed" as const,
      command: "agy -p <prompt>",
    }));
    renderPage({ attempts: manyAttempts });

    expect(screen.queryByText("Window:")).toBeNull();
    await fireEvent.click(screen.getByLabelText("Expand Antigravity"));

    expect(document.querySelectorAll("details [aria-label='failed']")).toHaveLength(5);
    expect(screen.getAllByText("Session · agy").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Claude · agy").length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText("Antigravity · Claude · agy")).toBeNull();
    expect(screen.getAllByText("Window:").length).toBe(5);
    expect(screen.getAllByText("Window:")[0]?.parentElement?.textContent).toContain("Session");
    expect(screen.getAllByText("Runner:")[0]?.parentElement?.textContent).toContain("agy");
    expect(screen.queryByText("failed")).toBeNull();
    expect(screen.queryByText("Confirmed")).toBeNull();
    expect(screen.queryByText("Failed")).toBeNull();
    expect(
      screen.getAllByText(formatWindowStarterClock("2026-09-01T00:00:00.000Z")).length,
    ).toBeGreaterThanOrEqual(1);
  });

  it("marks unconfirmed activity with an alert icon, not the waiting clock", async () => {
    render(WindowStarterPage, {
      props: {
        enabled: true,
        historyReady: true,
        providers,
        attempts: [
          {
            id: "u1",
            providerId: "antigravity",
            windowLine: "Session",
            runnerId: "agy",
            startedAt: "2026-09-11T11:13:00.000Z",
            status: "unconfirmed",
            error: "Quota reset did not update within two minutes.",
          },
        ],
        onEnabledChange: vi.fn(),
      },
    });

    await fireEvent.click(screen.getByLabelText("Expand Antigravity"));
    expect(screen.getAllByLabelText("unconfirmed")).toHaveLength(2);
    expect(screen.queryByLabelText("pending")).toBeNull();
  });

  it("shows Claude Code on a single-window log title", async () => {
    renderPage({
      attempts: [
        {
          id: "c1",
          providerId: "claude",
          windowLine: "Session",
          runnerId: "claude",
          startedAt: "2026-09-14T08:07:00.000Z",
          status: "confirmed",
        },
      ],
    });

    await fireEvent.click(screen.getByLabelText("Expand Claude"));
    expect(document.querySelector("summary .font-medium")?.textContent).toBe("Claude Code");
    const row = screen.getByLabelText("Claude · Session");
    expect(row.querySelector('[aria-label="confirmed"]')).toBeTruthy();
    expect(row.textContent).toContain(formatWindowStarterClock("2026-09-14T08:07:00.000Z"));
    expect(row.textContent).not.toContain("Claude Code");
  });

  it("keeps the card expanded when a log summary is clicked", async () => {
    renderPage();

    await fireEvent.click(screen.getByLabelText("Expand Antigravity"));
    expect(screen.getByLabelText("Collapse Antigravity")).toBeTruthy();

    const summary = document.querySelector("summary");
    expect(summary).toBeTruthy();
    await fireEvent.click(summary!);

    expect(screen.getByLabelText("Collapse Antigravity")).toBeTruthy();
    expect(summary?.closest("details")?.open).toBe(true);
  });

  it("toggles window participation from the row context menu", async () => {
    const onWindowParticipation = vi.fn();
    renderPage({ onWindowParticipation });

    await fireEvent.contextMenu(screen.getByLabelText("Antigravity · Session"));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Turn on" }));
    expect(onWindowParticipation).toHaveBeenCalledWith("antigravity", "session", true);
  });

  it("opens Customize L2 from the row context menu", async () => {
    const onCustomize = vi.fn();
    renderPage({ onCustomize });

    await fireEvent.contextMenu(screen.getByLabelText("Claude · Session"));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Customize…" }));
    expect(onCustomize).toHaveBeenCalledWith("claude");
  });

  it("confirms a manual run before executing", async () => {
    const onManualRun = vi.fn();
    renderPage({ onManualRun });

    await fireEvent.contextMenu(screen.getByLabelText("Claude · Session"));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Run now…" }));
    expect(onManualRun).not.toHaveBeenCalled();
    expect(screen.getByRole("alertdialog", { name: "Run Window Starter?" })).toBeTruthy();

    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onManualRun).not.toHaveBeenCalled();

    await fireEvent.contextMenu(screen.getByLabelText("Claude · Session"));
    await fireEvent.click(screen.getByRole("menuitem", { name: "Run now…" }));
    await fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(onManualRun).toHaveBeenCalledTimes(1);
    expect(onManualRun.mock.calls[0][0].pluginId).toBe("claude");
    expect(onManualRun.mock.calls[0][0].windowLine).toBe("Session");
  });

  it("disables Run now when the CLI is missing", async () => {
    renderPage();

    await fireEvent.contextMenu(screen.getByLabelText("Antigravity · Claude"));
    expect(screen.getByRole("menuitem", { name: "Run now…" }).hasAttribute("disabled")).toBe(true);
  });
});
