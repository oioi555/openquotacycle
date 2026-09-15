import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import ResetCustomizationDialog from "./reset-customization-dialog.svelte";

describe("resetCustomizationDialog", () => {
  it("renders the confirmation copy with cancel and reset actions", () => {
    render(ResetCustomizationDialog, { props: { onCancel: vi.fn(), onConfirm: vi.fn() } });

    expect(screen.getByRole("alertdialog", { name: "Reset All Customization?" })).toBeTruthy();
    expect(screen.getByText(/turns installed providers back on/)).toBeTruthy();
    expect(screen.getByText(/Window Starter participation, runner, and window picks/)).toBeTruthy();
    expect(screen.getByText(/global Window Starter switch is unchanged/)).toBeTruthy();
    expect(screen.queryByText(/global Window Starter switch is reset/i)).toBeNull();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reset All" })).toBeTruthy();
  });

  it("cancels without confirming", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(ResetCustomizationDialog, { props: { onCancel, onConfirm } });

    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms the reset", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(ResetCustomizationDialog, { props: { onCancel, onConfirm } });

    await fireEvent.click(screen.getByRole("button", { name: "Reset All" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels on Escape", async () => {
    const onCancel = vi.fn();
    render(ResetCustomizationDialog, { props: { onCancel, onConfirm: vi.fn() } });

    await fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels on backdrop click", async () => {
    const onCancel = vi.fn();
    render(ResetCustomizationDialog, { props: { onCancel, onConfirm: vi.fn() } });

    const backdrop = screen.getByRole("alertdialog").parentElement as HTMLElement;
    await fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("does not cancel when clicking inside the dialog", async () => {
    const onCancel = vi.fn();
    render(ResetCustomizationDialog, { props: { onCancel, onConfirm: vi.fn() } });

    await fireEvent.click(screen.getByRole("alertdialog"));
    expect(onCancel).not.toHaveBeenCalled();
  });
});
