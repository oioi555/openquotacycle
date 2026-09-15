import { fireEvent, render, screen } from "@testing-library/svelte";
import { describe, expect, it, vi } from "vitest";
import WindowStarterRunDialog from "./window-starter-run-dialog.svelte";

const props = {
  title: "Run Window Starter?",
  description: "This sends one starter request for Claude · Session with Claude Code.",
};

describe("windowStarterRunDialog", () => {
  it("renders the confirmation copy with cancel and run actions", () => {
    render(WindowStarterRunDialog, { props: { ...props, onCancel: vi.fn(), onConfirm: vi.fn() } });

    expect(screen.getByRole("alertdialog", { name: "Run Window Starter?" })).toBeTruthy();
    expect(screen.getByText(/Claude · Session with Claude Code/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Run" })).toBeTruthy();
  });

  it("cancels without confirming", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(WindowStarterRunDialog, { props: { ...props, onCancel, onConfirm } });

    await fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("confirms the run", async () => {
    const onCancel = vi.fn();
    const onConfirm = vi.fn();
    render(WindowStarterRunDialog, { props: { ...props, onCancel, onConfirm } });

    await fireEvent.click(screen.getByRole("button", { name: "Run" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onCancel).not.toHaveBeenCalled();
  });

  it("cancels on Escape", async () => {
    const onCancel = vi.fn();
    render(WindowStarterRunDialog, { props: { ...props, onCancel, onConfirm: vi.fn() } });

    await fireEvent.keyDown(document, { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it("cancels on backdrop click", async () => {
    const onCancel = vi.fn();
    render(WindowStarterRunDialog, { props: { ...props, onCancel, onConfirm: vi.fn() } });

    const backdrop = screen.getByRole("alertdialog").parentElement as HTMLElement;
    await fireEvent.click(backdrop);
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
