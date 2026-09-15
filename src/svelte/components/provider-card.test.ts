import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import type { PluginOutput } from "@/lib/plugin-types";
import ProviderCard from "./provider-card.svelte";

vi.mock("../lib/backend", () => ({
  openUrl: vi.fn(async () => {}),
  listenProbeBatchComplete: vi.fn(async () => () => {}),
  listenProbeResult: vi.fn(async () => () => {}),
  startProbeBatch: vi.fn(async () => ({ batchId: "b", pluginIds: [] })),
  createBatchId: vi.fn(() => "b"),
}));

const manifest = [
  { type: "progress" as const, label: "Session", scope: "overview" as const },
  { type: "progress" as const, label: "Weekly", scope: "overview" as const },
  { type: "text" as const, label: "Tokens", scope: "detail" as const },
];

const progressLine = (label: string) => ({
  type: "progress" as const,
  label,
  used: 40,
  limit: 100,
  format: { kind: "percent" as const },
});

const output = {
  providerId: "claude",
  displayName: "Claude",
  plan: "Pro",
  iconUrl: "claude.svg",
  lines: [progressLine("Session"), progressLine("Weekly"), { type: "text" as const, label: "Tokens", value: "1.2k" }],
} as unknown as PluginOutput;

function renderCard(props: Record<string, unknown>) {
  return render(ProviderCard, {
    props: {
      name: "Claude",
      plan: "Pro",
      skeletonLines: manifest,
      displayMode: "left",
      ...props,
    },
  });
}

describe("providerCard — usage-refresh rendering states", () => {
  it("shows the skeleton while loading without data", () => {
    const { container } = renderCard({ loading: true });

    expect(container.querySelector(".animate-pulse")).not.toBeNull();
    expect(screen.queryByText("40%")).toBeNull();
    expect(screen.getByText("Session").className).toContain("truncate");
    expect(container.querySelector('[role="progressbar"]')).toBeNull();
  });

  it("keeps lines on screen with shimmer while refreshing (stale-while-revalidate)", () => {
    const { container } = renderCard({
      lines: output.lines,
      lastUpdatedAt: Date.now(),
      loading: true,
      refreshing: true,
    });

    // Stale data stays visible...
    expect(screen.getAllByText("60%").length).toBeGreaterThan(0);
    // ...with the shimmer sweep on the progress bars...
    expect(container.querySelector('[data-slot="progress-refreshing"]')).not.toBeNull();
    // ...and no skeleton.
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("renders the blocking error only when there is no stale data", () => {
    const { container } = renderCard({
      loading: true,
      error: "Usage request failed (HTTP 429). Try again later.",
    });

    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Usage request failed (HTTP 429).");
    expect(alert).toHaveTextContent("Try again later.");
    expect(alert.className).toContain("ui-notice");
    expect(alert.className).not.toContain("text-destructive");
    expect(alert.querySelector('[data-slot="notice-icon"]')).not.toBeNull();
    expect(alert.querySelector('[data-slot="notice-title"]')?.textContent).toContain(
      "Usage request failed (HTTP 429).",
    );
    expect(alert.querySelector('[data-slot="notice-detail"]')?.textContent).toContain(
      "Try again later.",
    );
    expect(container.querySelector(".animate-pulse")).toBeNull();
  });

  it("keeps stale data visible and shows an inline error line on refresh failure", () => {
    const { container } = renderCard({
      lines: output.lines,
      lastUpdatedAt: Date.now(),
      staleError: "refresh failed",
    });

    expect(screen.getAllByText("60%").length).toBeGreaterThan(0);
    expect(screen.getByRole("alert").textContent).toContain("refresh failed");
  });

  it("renders status chips in the header, not as metric rows", () => {
    renderCard({
      lines: output.lines,
      statuses: [{ text: "Peak", tone: "danger" }],
    });

    const chip = screen.getByText("Peak");
    expect(chip.className).toContain("text-meter-critical");
    expect(chip.className).not.toContain("text-red-500");
    expect(chip.closest('[role="group"]')?.querySelector("h2")?.textContent).toBe("Claude");
    expect(screen.queryByText("Peak Hours")).toBeNull();
  });

  it("shows Start agy inside the error callout and calls onStartAgy", async () => {
    const onStartAgy = vi.fn();
    renderCard({
      error: "Antigravity session expired. Start Antigravity or agy and try again.",
      showStartAgy: true,
      onStartAgy,
    });
    const alert = screen.getByRole("alert");
    const button = screen.getByRole("button", { name: "Start agy" });
    expect(alert.querySelector('[data-slot="notice-title"]')?.textContent).toBe(
      "Antigravity session expired.",
    );
    expect(alert.querySelector('[data-slot="notice-detail"]')?.textContent).toContain(
      "Start Antigravity or agy and try again.",
    );
    expect(alert.contains(button)).toBe(true);
    expect(button.closest("[data-slot='notice-action']")).not.toBeNull();
    expect(alert.querySelector('[data-slot="notice-copy"]')?.contains(button)).toBe(false);
    expect(button).not.toHaveTextContent("Start agy");
    expect(button.querySelector("svg")).not.toBeNull();
    await fireEvent.pointerEnter(button);
    await waitFor(() => {
      expect(screen.getByText("Start agy to refresh the session")).toBeTruthy();
    });
    await fireEvent.click(button);
    expect(onStartAgy).toHaveBeenCalled();
  });

  it("keeps Start agy visible and busy while wake is in flight", () => {
    renderCard({
      error: "Antigravity session expired. Start Antigravity or agy and try again.",
      showStartAgy: true,
      startAgyBusy: true,
      onStartAgy: vi.fn(),
    });
    const button = screen.getByRole("button", { name: "Start agy" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector("svg")?.classList.contains("animate-spin")).toBe(true);
  });

  it("hides Start agy by default", () => {
    renderCard({ error: "Antigravity session expired. Start Antigravity or agy and try again." });
    expect(screen.queryByRole("button", { name: "Start agy" })).toBeNull();
  });

  it("shows Start grok inside the credential callout", async () => {
    const onStartAgy = vi.fn();
    renderCard({
      name: "Grok",
      error: "Grok session expired. Start Grok Build and try again.",
      showStartAgy: true,
      onStartAgy,
      wakeAriaLabel: "Start grok",
      wakeTooltip: "Start grok to refresh the session",
      wakeNotice: "Grok session expired. Start Grok Build and try again.",
    });
    const alert = screen.getByRole("alert");
    const button = screen.getByRole("button", { name: "Start grok" });
    expect(alert.querySelector('[data-slot="notice-title"]')?.textContent).toBe(
      "Grok session expired.",
    );
    expect(alert.querySelector('[data-slot="notice-detail"]')?.textContent).toContain(
      "Start Grok Build and try again.",
    );
    expect(alert.contains(button)).toBe(true);
    await fireEvent.pointerEnter(button);
    await waitFor(() => {
      expect(screen.getByText("Start grok to refresh the session")).toBeTruthy();
    });
    await fireEvent.click(button);
    expect(onStartAgy).toHaveBeenCalled();
  });

  it("keeps Start grok visible and busy while wake is in flight", () => {
    renderCard({
      error: "Grok session expired. Start Grok Build and try again.",
      showStartAgy: true,
      startAgyBusy: true,
      onStartAgy: vi.fn(),
      wakeAriaLabel: "Start grok",
    });
    const button = screen.getByRole("button", { name: "Start grok" });
    expect(button).toHaveProperty("disabled", true);
    expect(button.getAttribute("aria-busy")).toBe("true");
    expect(button.querySelector("svg")?.classList.contains("animate-spin")).toBe(true);
  });

  it("shows Start agy inside the Stale callout with the start-agy notice", () => {
    const onStartAgy = vi.fn();
    renderCard({
      name: "Antigravity",
      statuses: [{ text: "Stale", tone: "warning" }],
      lines: [progressLine("Session")],
      showStartAgy: true,
      onStartAgy,
    });
    const alert = screen.getByRole("alert");
    const button = screen.getByRole("button", { name: "Start agy" });
    expect(alert.querySelector('[data-slot="notice-title"]')?.textContent).toBe(
      "Antigravity session expired.",
    );
    expect(alert.querySelector('[data-slot="notice-detail"]')?.textContent).toContain(
      "Start Antigravity or agy and try again.",
    );
    expect(alert.contains(button)).toBe(true);
    expect(button.closest("[data-slot='notice-action']")).not.toBeNull();
    expect(alert.querySelector('[data-slot="notice-copy"]')?.contains(button)).toBe(false);
    expect(screen.getByText("Stale")).toBeTruthy();
  });

  it("splits two-sentence stale notices the same way with or without an action", () => {
    renderCard({
      name: "Grok",
      statuses: [{ text: "Stale", tone: "warning" }],
      lines: [progressLine("Weekly")],
      staleError: "Grok session expired. Start Grok Build and try again.",
    });
    const alert = screen.getByRole("alert");
    expect(alert.querySelector('[data-slot="notice-title"]')?.textContent).toBe(
      "Grok session expired.",
    );
    expect(alert.querySelector('[data-slot="notice-detail"]')?.textContent).toContain(
      "Start Grok Build and try again.",
    );
    expect(alert.querySelector('[data-slot="notice-action"]')).toBeNull();
  });

  it("omits a status placeholder when there are no chips", () => {
    const { container } = renderCard({ lines: output.lines, statuses: [] });
    const header = container.querySelector("h2")?.parentElement;
    expect(header?.textContent).toContain("Claude");
    expect(header?.textContent).toContain("Pro");
    expect(screen.queryByText("Peak")).toBeNull();
  });
});

describe("providerCard — overview scoping and visibility", () => {
  it("overview scope only shows manifest overview lines", () => {
    renderCard({ lines: output.lines, scopeFilter: "overview" });

    expect(screen.getByText("Session")).toBeTruthy();
    expect(screen.getByText("Weekly")).toBeTruthy();
    expect(screen.queryByText("Tokens")).toBeNull();
  });

  it("hides any progress line classified On-Demand, including the first", () => {
    renderCard({
      lines: output.lines,
      skeletonLines: manifest,
      hiddenProgressLabels: ["Session"],
    });

    // No mandatory line: the first can be On-Demand like any other.
    expect(screen.queryByText("Session")).toBeNull();
    expect(screen.getByText("Weekly")).toBeTruthy();
  });

  it("orders progress lines by the stored label order", () => {
    const { container } = renderCard({
      lines: output.lines,
      skeletonLines: manifest,
      lineLabelsOrder: ["Weekly", "Session"],
    });

    const text = container.textContent ?? "";
    expect(text.indexOf("Weekly")).toBeLessThan(text.indexOf("Session"));
  });

  it("hides text statistics when requested", () => {
    renderCard({ lines: output.lines, hiddenProgressLabels: ["Tokens"] });
    expect(screen.queryByText("Tokens")).toBeNull();
  });
});

describe("providerCard — reset timer toggle", () => {
  it("clicking the reset label triggers the display-mode toggle", async () => {
    const onResetTimerDisplayModeToggle = vi.fn();
    const line = {
      ...progressLine("Session"),
      resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      periodDurationMs: 5 * 60 * 60 * 1000,
    };
    renderCard({
      lines: [line],
      resetTimerDisplayMode: "relative",
      onResetTimerDisplayModeToggle,
    });

    const button = screen.getByRole("button", { name: /Resets in|Resets today|Not started/ });
    await fireEvent.click(button);
    expect(onResetTimerDisplayModeToggle).toHaveBeenCalledTimes(1);
  });
});

describe("providerCard — expandable dashboard card", () => {
  it("hides On-Demand lines when collapsed and reveals them when expanded", async () => {
    renderCard({
      lines: output.lines,
      expandable: true,
      expanded: false,
      hiddenProgressLabels: ["Weekly", "Tokens"],
    });
    expect(screen.getAllByText("Session").length).toBeGreaterThan(0);
    expect(screen.queryByText("Weekly")).toBeNull();
    expect(screen.queryByText("Tokens")).toBeNull();

    const { rerender } = renderCard({
      lines: output.lines,
      expandable: true,
      expanded: false,
      hiddenProgressLabels: ["Weekly", "Tokens"],
    });
    await rerender({
      props: {
        name: "Claude",
        plan: "Pro",
        skeletonLines: manifest,
        displayMode: "left",
        lines: output.lines,
        expandable: true,
        expanded: true,
        hiddenProgressLabels: ["Weekly", "Tokens"],
      },
    });

    // Expanded card shows every line regardless of classification...
    expect(screen.getAllByText("Weekly").length).toBeGreaterThan(0);
    expect(screen.getByText("Tokens")).toBeTruthy();
    // ...and the bottom divider reflects the expanded state.
    expect(screen.getByLabelText("Collapse Claude")).toBeTruthy();
  });

  it("pins the divider between sections without a more-count", () => {
    const { container } = renderCard({
      lines: output.lines,
      expandable: true,
      expanded: false,
      hiddenProgressLabels: ["Weekly", "Tokens"],
    });

    expect(screen.queryByText("Weekly")).toBeNull();
    expect(screen.queryByText(/more/)).toBeNull();
    const divider = screen.getByLabelText("Expand Claude");
    const session = screen.getByText("Session");
    expect(session.compareDocumentPosition(divider) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(container.querySelector(".ui-card")?.className).toContain("pt-[15px]");
    expect(container.querySelector(".ui-card")?.className).toContain("pb-2");
  });

  it("matches top padding at the bottom when there is no expand control", () => {
    const { container } = renderCard({
      lines: [progressLine("Session")],
      expandable: true,
      hiddenProgressLabels: ["Extra Usage", "Weekly"],
    });
    expect(screen.queryByLabelText("Expand Claude")).toBeNull();
    expect(screen.queryByText(/more/)).toBeNull();
    const card = container.querySelector(".ui-card");
    expect(card?.className).toContain("pt-[15px]");
    expect(card?.className).toContain("pb-[15px]");
    expect(card?.className).toContain("ui-pressable");
    expect(card?.className).toContain("hover:bg-card-hover");
    expect(card?.className).not.toContain("pb-2");
    expect(card?.querySelector('[data-slot="card-expand-spacer"]')).toBeNull();
    expect(card?.querySelector('[data-slot="card-expand-slot"]')).toBeNull();
  });

  it("toggling the caret notifies the parent", async () => {
    const onToggleExpand = vi.fn();
    renderCard({
      lines: output.lines,
      expandable: true,
      hiddenProgressLabels: ["Weekly"],
      onToggleExpand,
    });

    await fireEvent.click(screen.getByLabelText("Expand Claude"));
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
  });

  it("toggles expand when the card body is clicked", async () => {
    const onToggleExpand = vi.fn();
    const { container } = renderCard({
      lines: output.lines,
      expandable: true,
      hiddenProgressLabels: ["Weekly"],
      onToggleExpand,
    });

    await fireEvent.click(container.querySelector(".ui-card") as HTMLElement);
    expect(onToggleExpand).toHaveBeenCalledTimes(1);
    expect(screen.getByLabelText("Expand Claude")).toBeTruthy();
    expect(container.querySelector(".ui-card")?.className).toContain("ui-pressable");
    expect(container.querySelector(".ui-card")?.className).toContain("hover:bg-card-hover");
    expect(screen.getByLabelText("Expand Claude").className).not.toContain("ui-pressable");
  });

  it("does not toggle expand from nested controls or the header", async () => {
    const onToggleExpand = vi.fn();
    const onDisplayModeToggle = vi.fn();
    const onResetTimerDisplayModeToggle = vi.fn();
    const line = {
      ...progressLine("Session"),
      resetsAt: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
      periodDurationMs: 5 * 60 * 60 * 1000,
    };
    renderCard({
      lines: [line, progressLine("Weekly")],
      expandable: true,
      hiddenProgressLabels: ["Weekly"],
      onToggleExpand,
      onDisplayModeToggle,
      onResetTimerDisplayModeToggle,
      links: [{ label: "Console", url: "https://example.com" }],
      expanded: true,
    });

    await fireEvent.click(screen.getAllByTitle("Toggle used / left")[0]);
    await fireEvent.click(screen.getByRole("button", { name: /Resets in|Resets today|Not started/ }));
    await fireEvent.click(screen.getByRole("button", { name: "Console, opens in browser" }));
    await fireEvent.click(screen.getByRole("heading", { name: "Claude" }));
    expect(onToggleExpand).not.toHaveBeenCalled();
    expect(onDisplayModeToggle).toHaveBeenCalledTimes(1);
    expect(onResetTimerDisplayModeToggle).toHaveBeenCalledTimes(1);
  });

  it("does not toggle from a card body without on-demand content", async () => {
    const onToggleExpand = vi.fn();
    const { container } = renderCard({
      lines: [progressLine("Session")],
      expandable: true,
      onToggleExpand,
    });

    await fireEvent.click(container.querySelector(".ui-card") as HTMLElement);
    expect(onToggleExpand).not.toHaveBeenCalled();
    expect(screen.queryByLabelText("Expand Claude")).toBeNull();
  });

  it("renders no divider without on-demand content", () => {
    const { container } = renderCard({ lines: output.lines, expandable: true });

    expect(screen.queryByLabelText("Expand Claude")).toBeNull();
    expect(container.querySelector('[data-slot="card-expand-slot"]')).toBeNull();
    expect(container.querySelector(".ui-card")?.className).toContain("pb-[15px]");
  });

  it("keeps quick links for the expanded card only", () => {
    renderCard({
      lines: output.lines,
      links: [{ label: "Console", url: "https://example.com" }],
      expandable: true,
      expanded: false,
    });
    expect(screen.queryByText("Console")).toBeNull();

    renderCard({
      lines: output.lines,
      links: [{ label: "Console", url: "https://example.com" }],
      expandable: false,
    });
    expect(screen.getByText("Console")).toBeTruthy();
  });

  it("assigns equal-width columns to provider links and caps at three", () => {
    const { container } = renderCard({
      lines: output.lines,
      links: [
        { label: "Dashboard", url: "https://example.com/dash" },
        { label: "API Keys", url: "https://example.com/keys" },
      ],
      expandable: true,
      expanded: true,
    });
    const row = container.querySelector('[data-slot="provider-links"]') as HTMLElement | null;
    expect(row?.style.getPropertyValue("--provider-link-columns")).toBe("2");
    expect(row?.className.split(/\s+/)).toContain("grid");
    expect(screen.getByRole("button", { name: "Dashboard, opens in browser" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "API Keys, opens in browser" })).toBeTruthy();

    const { container: four } = renderCard({
      lines: output.lines,
      links: [
        { label: "A", url: "https://example.com/a" },
        { label: "B", url: "https://example.com/b" },
        { label: "C", url: "https://example.com/c" },
        { label: "D", url: "https://example.com/d" },
      ],
      expandable: false,
    });
    const capped = four.querySelector('[data-slot="provider-links"]') as HTMLElement | null;
    expect(capped?.style.getPropertyValue("--provider-link-columns")).toBe("3");
  });

  it("keeps links under on-demand lines", () => {
    const { container } = renderCard({
      lines: output.lines,
      links: [{ label: "Usage", url: "https://example.com/usage" }],
      expandable: true,
      expanded: true,
      hiddenProgressLabels: ["Tokens"],
    });
    const tokens = screen.getByText("Tokens");
    const links = container.querySelector('[data-slot="provider-links"]');
    expect(links).not.toBeNull();
    expect(tokens.compareDocumentPosition(links as Node) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("fires the header context menu handler", async () => {
    const onHeaderContextMenu = vi.fn();
    const { container } = renderCard({
      lines: output.lines,
      onHeaderContextMenu,
    });

    await fireEvent.contextMenu(container.firstElementChild as HTMLElement);
    expect(onHeaderContextMenu).toHaveBeenCalledTimes(1);
  });
});
