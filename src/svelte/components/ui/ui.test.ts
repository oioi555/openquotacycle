import { fireEvent, render, screen, waitFor } from "@testing-library/svelte";
import { createRawSnippet } from "svelte";
import { describe, expect, it, vi } from "vitest";
import Alert from "./alert.svelte";
import Badge from "./badge.svelte";
import Button from "./button.svelte";
import Checkbox from "./checkbox.svelte";
import Progress from "./progress.svelte";
import Switch from "./switch.svelte";
import Separator from "./separator.svelte";
import Skeleton from "./skeleton.svelte";
import TabsHarness from "./tabs.test-harness.svelte";
import TooltipHarness from "./tooltip.test-harness.svelte";
import DropdownHarness from "./dropdown.test-harness.svelte";

function snippet(text: string) {
  return createRawSnippet(() => ({ render: () => text }));
}

describe("ui primitives", () => {
  it("button renders, applies variants, and fires once per click", async () => {
    const onclick = vi.fn();
    render(Button, {
      props: { variant: "outline", size: "sm", onclick, children: snippet("Save") },
    });

    const button = screen.getByRole("button");
    expect(button).toHaveTextContent("Save");
    expect(button.className).toContain("bg-background");
    expect(button.className).toContain("ui-pressable");

    await fireEvent.click(button);
    await fireEvent.click(button);
    expect(onclick).toHaveBeenCalledTimes(2);
  });

  it("does not lift link buttons", () => {
    render(Button, {
      props: { variant: "link", children: snippet("Docs") },
    });
    expect(screen.getByRole("button").className).not.toContain("ui-pressable");
  });

  it("checkbox fires onCheckedChange exactly once per click", async () => {
    const onCheckedChange = vi.fn();
    render(Checkbox, { props: { onCheckedChange } });

    const checkbox = screen.getByRole("checkbox");
    await fireEvent.click(checkbox);

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("switch fires onCheckedChange with the flipped value", async () => {
    const onCheckedChange = vi.fn();
    render(Switch, { props: { checked: false, onCheckedChange, "aria-label": "Enable" } });

    const toggle = screen.getByRole("switch", { name: "Enable" });
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(toggle.className).not.toContain("ui-pressable");
    await fireEvent.click(toggle);

    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it("progress clamps values and renders the pace marker", () => {
    const { container } = render(Progress, { props: { value: 150, markerValue: 50 } });

    const bar = container.querySelector('[role="progressbar"]');
    expect(bar).not.toBeNull();
    expect(bar?.getAttribute("aria-valuenow")).toBe("100");

    const fill = bar?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("100%");
    expect(container.querySelector('[data-slot="progress-marker"]')).not.toBeNull();
  });

  it("progress shows the marker for partial bars", () => {
    const { container } = render(Progress, { props: { value: 42, markerValue: 50 } });

    expect(container.querySelector('[data-slot="progress-marker"]')).not.toBeNull();
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute("aria-valuenow")).toBe("42");
    const fill = bar?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("42%");
    expect(fill.style.minWidth).toBe("4px");
    expect(fill.style.backgroundColor).toBe("var(--meter-fill)");
    expect(bar?.className).toContain("h-[4px]");
    expect(container.querySelector('[data-slot="progress-marker"]')?.className).toContain("h-[12px]");
  });

  it("progress emphasizes the crossing-go tick", () => {
    const { container } = render(Progress, {
      props: { value: 10, markerValue: 85, markerEmphasis: "go" },
    });
    const marker = container.querySelector('[data-slot="progress-marker"]');
    expect(marker?.getAttribute("data-crossing-go")).toBe("true");
    expect(marker?.className).toContain("bg-meter-fill");
    expect(marker?.className).not.toContain("meter-go-tick");
    expect(marker?.className).not.toContain("shadow-");
    expect(marker?.className).toContain("w-[4px]");
    expect(marker?.className).toContain("h-[16px]");
    expect(marker?.className).toContain("opacity-100");
  });

  it("progress shades the headroom slice", () => {
    const { container } = render(Progress, {
      props: { value: 0, markerValue: 80, budgetStart: 0, budgetEnd: 80 },
    });
    const zone = container.querySelector("[data-slot='progress-headroom']") as HTMLElement;
    expect(zone.style.left).toBe("0%");
    expect(zone.style.width).toBe("80%");
    expect(zone.className).toContain("meter-headroom-hatch");
    expect(zone.className).not.toContain("meter-headroom-hatch-go");
    expect(zone.className).not.toContain("bg-meter-fill");
    expect(zone.className).not.toContain("bg-meter-warning");
  });

  it("progress uses a denser hatch when crossing-go", () => {
    const { container } = render(Progress, {
      props: {
        value: 0,
        markerValue: 80,
        budgetStart: 0,
        budgetEnd: 100,
        budgetEmphasis: "go",
      },
    });
    const zone = container.querySelector("[data-slot='progress-headroom']") as HTMLElement;
    expect(zone.getAttribute("data-crossing-go")).toBe("true");
    expect(zone.className).toContain("meter-headroom-hatch-go");
    expect(zone.className).not.toContain("bg-meter-headroom/85");
    expect(zone.className).not.toContain("bg-meter-warning");
  });

  it("clips solid fill so leftover past the tick is only the hatch", () => {
    const { container } = render(Progress, {
      props: { value: 98, markerValue: 26, budgetStart: 26, budgetEnd: 98 },
    });
    const bar = container.querySelector('[role="progressbar"]');
    expect(bar?.getAttribute("aria-valuenow")).toBe("98");
    const fill = bar?.firstElementChild as HTMLElement;
    expect(fill.style.width).toBe("26%");
    const zone = container.querySelector("[data-slot='progress-headroom']") as HTMLElement;
    expect(zone.style.left).toBe("26%");
    expect(zone.style.width).toBe("72%");
    expect(zone.className).toContain("meter-headroom-hatch");
  });

  it("progress omits the headroom slice without a budget", () => {
    const { container } = render(Progress, { props: { value: 0, markerValue: 80 } });
    expect(container.querySelector("[data-slot='progress-headroom']")).toBeNull();
  });

  it("progress shows the marker on full bars", () => {
    const { container } = render(Progress, { props: { value: 100, markerValue: 50 } });
    expect(container.querySelector('[data-slot="progress-marker"]')).not.toBeNull();
  });

  it("progress omits the marker without a marker value", () => {
    const { container } = render(Progress, { props: { value: 42 } });
    expect(container.querySelector('[data-slot="progress-marker"]')).toBeNull();
  });

  it("badge and alert render content with variants", () => {
    render(Badge, { props: { variant: "outline", children: snippet("Pro plan") } });
    expect(screen.getByText("Pro plan")).toBeTruthy();

    render(Alert, { props: { variant: "destructive", children: snippet("boom") } });
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("boom");
    expect(alert.className).toContain("text-destructive");
  });

  it("alert warning variant uses the compact notice surface", () => {
    const { container } = render(Alert, { props: { variant: "warning", children: snippet("careful") } });
    const alert = container.querySelector('[role="alert"]');
    expect(alert?.textContent).toContain("careful");
    expect(alert?.className).toContain("ui-notice");
    expect(alert?.className).not.toContain("text-destructive");
    expect(alert?.className).not.toContain("p-4");
    expect(alert?.className).not.toContain("text-sm");
  });

  it("separator renders the requested orientation", () => {
    const { container } = render(Separator, { props: { orientation: "vertical" } });
    expect(container.querySelector('[data-orientation="vertical"]')).not.toBeNull();
  });

  it("skeleton renders a pulsing placeholder", () => {
    const { container } = render(Skeleton, { props: { class: "h-3" } });
    expect(container.firstElementChild?.className).toContain("animate-pulse");
  });

  it("tabs switch the selected trigger", async () => {
    render(TabsHarness, { props: {} });

    const triggerA = screen.getByRole("tab", { name: "Tab A" });
    const triggerB = screen.getByRole("tab", { name: "Tab B" });
    expect(triggerA.getAttribute("aria-selected")).toBe("true");

    await fireEvent.click(triggerB);

    expect(triggerB.getAttribute("aria-selected")).toBe("true");
    expect(triggerA.getAttribute("aria-selected")).toBe("false");
  });

  it("tooltip renders content when open", async () => {
    render(TooltipHarness, { props: { open: true } });

    await waitFor(() => {
      expect(screen.getByText("usage detail")).toBeTruthy();
    });
    expect(screen.getByText("hover me")).toBeTruthy();
  });

  it("dropdown menu renders its items when open", async () => {
    render(DropdownHarness, { props: { open: true } });

    await waitFor(() => {
      expect(screen.getByText("menu body")).toBeTruthy();
    });
    expect(screen.getByText("open menu")).toBeTruthy();
  });
});
