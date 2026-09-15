import { fireEvent, render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { beforeEach, describe, expect, it, vi } from "vitest";
import CustomizePage from "./customize.svelte";
import { appUiController } from "../controllers/app-ui-controller.svelte";
import type { SettingsPluginConfig } from "../lib/view-types";

const plugins: SettingsPluginConfig[] = [
  { id: "claude", name: "Claude", enabled: true, iconUrl: "/icons/claude.svg", brandColor: "#de7356", overviewProgressBars: [] },
  { id: "codex", name: "Codex", enabled: false, iconUrl: "", overviewProgressBars: [] },
];

describe("customize (Customize L1)", () => {
  beforeEach(() => {
    appUiController.resetState();
  });

  it("does not link to Settings from a bottom row", () => {
    appUiController.setScreen("customize");
    const { container } = render(CustomizePage, {
      props: { plugins, onReorder: vi.fn(), onToggle: vi.fn(), onOpenDetail: vi.fn() },
    });

    expect(screen.queryByText("Notifications, appearance and more")).toBeNull();
    expect(screen.queryByText(/Choose your providers/)).toBeNull();
    expect(container.querySelector(".ui-list")).not.toBeNull();
    expect(container.querySelector(".ui-nav-row")).toBeNull();
  });

  it("lists providers with enable state", () => {
    render(CustomizePage, {
      props: { plugins, onReorder: vi.fn(), onToggle: vi.fn(), onOpenDetail: vi.fn() },
    });

    expect(screen.getByText("Claude")).toBeTruthy();
    expect(screen.getByText("Codex")).toBeTruthy();
    expect(screen.getByLabelText("Enable Codex").getAttribute("aria-checked")).toBe("false");
  });

  it("opens the provider detail from a row activation (not the enable toggle)", async () => {
    const onOpenDetail = vi.fn();
    const onToggle = vi.fn();
    render(CustomizePage, {
      props: { plugins, onReorder: vi.fn(), onToggle, onOpenDetail },
    });

    await fireEvent.click(screen.getByText("Codex"));
    expect(onOpenDetail).toHaveBeenCalledWith("codex");
    expect(onToggle).not.toHaveBeenCalled();
  });

  it("shows provider icons where known", () => {
    render(CustomizePage, {
      props: { plugins, onReorder: vi.fn(), onToggle: vi.fn(), onOpenDetail: vi.fn() },
    });

    expect(screen.getByRole("img", { name: "Claude" })).toBeTruthy();
    expect(screen.queryByRole("img", { name: "Codex" })).toBeNull();
  });

  it("shows metric counts and switches for enablement", () => {
    render(CustomizePage, {
      props: { plugins, onReorder: vi.fn(), onToggle: vi.fn(), onOpenDetail: vi.fn() },
    });

    expect(screen.getAllByText("0 metrics")).toHaveLength(2);
    const toggle = screen.getByRole("switch", { name: "Enable Claude" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
  });

  it("toggles enablement from the switch without opening the detail", async () => {
    const onOpenDetail = vi.fn();
    const onToggle = vi.fn();
    render(CustomizePage, {
      props: { plugins, onReorder: vi.fn(), onToggle, onOpenDetail },
    });

    await fireEvent.click(screen.getByLabelText("Enable Codex"));
    expect(onToggle).toHaveBeenCalledWith("codex");
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("shows a Timeline visibility switch independent of the provider list", async () => {
    const onTimelineCardVisibleChange = vi.fn();
    const onReorder = vi.fn();
    const onToggle = vi.fn();
    const onOpenDetail = vi.fn();
    const { container } = render(CustomizePage, {
      props: {
        plugins,
        onReorder,
        onToggle,
        onOpenDetail,
        timelineCardVisible: true,
        onTimelineCardVisibleChange,
      },
    });

    const lists = container.querySelectorAll(".ui-list");
    expect(lists).toHaveLength(2);
    expect(lists[0]?.textContent).toContain("Timeline");
    expect(lists[0]?.textContent).toContain("Dashboard card");
    expect(lists[1]?.textContent).toContain("Claude");
    expect(container.querySelector("ul")?.textContent).not.toContain("Timeline");

    const toggle = screen.getByRole("switch", { name: "Show Timeline on dashboard" });
    expect(toggle.getAttribute("aria-checked")).toBe("true");
    expect(toggle.closest("ul")).toBeNull();
    expect(lists[0]?.querySelectorAll("svg")).toHaveLength(2);
    expect(lists[0]?.querySelector(".ui-nav-row")).toBeNull();

    await fireEvent.click(toggle);
    expect(onTimelineCardVisibleChange).toHaveBeenCalledWith(false);
    expect(onReorder).not.toHaveBeenCalled();
    expect(onToggle).not.toHaveBeenCalled();
    expect(onOpenDetail).not.toHaveBeenCalled();
  });

  it("opens Timeline detail from the row without toggling visibility", async () => {
    const onOpenDetail = vi.fn();
    const onTimelineCardVisibleChange = vi.fn();
    render(CustomizePage, {
      props: {
        plugins,
        onReorder: vi.fn(),
        onToggle: vi.fn(),
        onOpenDetail,
        timelineCardVisible: true,
        onTimelineCardVisibleChange,
      },
    });

    await fireEvent.click(screen.getByLabelText("Configure Timeline"));
    expect(onOpenDetail).toHaveBeenCalledWith("timeline");
    expect(onTimelineCardVisibleChange).not.toHaveBeenCalled();
  });

  it("keeps the provider list synchronized during a dnd consider event", async () => {
    const onReorder = vi.fn();
    const { container } = render(CustomizePage, {
      props: { plugins, onReorder, onToggle: vi.fn(), onOpenDetail: vi.fn() },
    });
    const list = container.querySelector("ul");
    expect(list).toBeTruthy();

    const reordered = [plugins[1], plugins[0]];
    list?.dispatchEvent(new CustomEvent("consider", { detail: { items: reordered } }));
    await tick();

    expect(Array.from(container.querySelectorAll("[data-settings-row]"), (row) => row.textContent?.trim()).map((text) => text?.split("\n")[0])).toEqual([
      "Codex 0 metrics",
      "Claude 0 metrics",
    ]);
    expect(onReorder).not.toHaveBeenCalled();

    list?.dispatchEvent(new CustomEvent("finalize", { detail: { items: reordered } }));
    expect(onReorder).toHaveBeenCalledWith(["codex", "claude"]);
  });
});
