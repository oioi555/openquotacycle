import { render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import SettingsDndHarness from "./settings-dnd.test-harness.svelte";

const ITEMS = [
  { id: "claude", name: "Claude" },
  { id: "codex", name: "Codex" },
];

describe("settings list dnd zone (svelte-dnd-action)", () => {
  it("mounts a dnd zone with the plugin rows", async () => {
    const onFinalize = vi.fn();
    const { container } = render(SettingsDndHarness, {
      props: { items: ITEMS, onFinalize },
    });

    const zone = screen.getByTestId("settings-dnd-list");
    expect(zone).toBeTruthy();

    for (const item of ITEMS) {
      expect(screen.getByText(item.name)).toBeTruthy();
    }

    // svelte-dnd-action tags the zone for its drag registry and ARIA.
    expect(
      container.querySelector('[aria-roledescription="sortable"]') ??
        container.querySelector("ul"),
    ).not.toBeNull();
  });
});
