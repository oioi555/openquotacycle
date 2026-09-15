import { beforeEach, describe, expect, it, vi } from "vitest";
import type { WindowStarterAttempt } from "@/lib/window-starter";
import { windowStarterController } from "./window-starter-controller.svelte";

const libMocks = vi.hoisted(() => ({
  addWindowStarterAttempt: vi.fn((attempts, attempt) => [attempt, ...attempts]),
  getLatestAttemptForProvider: vi.fn(() => null),
  getLatestAttemptForWindow: vi.fn(() => null),
  getProviderLockRemainingMs: vi.fn(() => null),
  getWindowLockRemainingMs: vi.fn(() => null),
  isProviderLocked: vi.fn(() => false),
  isWindowLocked: vi.fn(() => false),
  loadWindowStarterAttempts: vi.fn(async () => []),
  saveWindowStarterAttempts: vi.fn(async () => undefined),
}));

vi.mock("@/lib/window-starter", () => libMocks);

const attempt: WindowStarterAttempt = {
  id: "a1",
  providerId: "codex",
  startedAt: "2026-09-06T00:00:00.000Z",
  status: "pending",
  prompt: "prompt",
  command: "codex",
};

describe("windowStarterController", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    windowStarterController.resetState();
  });

  it("adds an attempt newest-first and persists it", async () => {
    await windowStarterController.addAttempt(attempt);

    expect(windowStarterController.attempts[0].id).toBe("a1");
    expect(libMocks.saveWindowStarterAttempts).toHaveBeenCalledWith(
      windowStarterController.attempts,
    );
  });

  it("patches an attempt in place and persists", async () => {
    await windowStarterController.addAttempt(attempt);

    await windowStarterController.updateAttempt("a1", { status: "confirmed" });

    expect(windowStarterController.attempts[0].status).toBe("confirmed");
    expect(libMocks.saveWindowStarterAttempts).toHaveBeenCalled();
  });

  it("setAttemptStatus delegates to updateAttempt", async () => {
    await windowStarterController.addAttempt(attempt);

    await windowStarterController.setAttemptStatus("a1", "failed");

    expect(windowStarterController.attempts[0].status).toBe("failed");
  });

  it("hydrates persisted attempts", async () => {
    libMocks.loadWindowStarterAttempts.mockResolvedValue([attempt]);

    await windowStarterController.loadAttempts();

    expect(windowStarterController.attempts).toEqual([attempt]);
  });

  it("delegates lock queries to the library", () => {
    windowStarterController.isProviderLocked("codex", 0);
    windowStarterController.getLatestAttemptForProvider("codex");
    windowStarterController.getProviderLockRemainingMs("codex", 0);
    windowStarterController.isWindowLocked("antigravity", "Claude", 0);
    windowStarterController.getLatestAttemptForWindow("antigravity", "Session");
    windowStarterController.getWindowLockRemainingMs("antigravity", "Claude", 0);

    expect(libMocks.isProviderLocked).toHaveBeenCalled();
    expect(libMocks.getLatestAttemptForProvider).toHaveBeenCalledWith(
      expect.anything(),
      "codex",
    );
    expect(libMocks.getProviderLockRemainingMs).toHaveBeenCalledWith(
      expect.anything(),
      "codex",
      0,
    );
    expect(libMocks.isWindowLocked).toHaveBeenCalledWith(
      expect.anything(),
      "antigravity",
      "Claude",
      0,
      undefined,
    );
    expect(libMocks.getLatestAttemptForWindow).toHaveBeenCalledWith(
      expect.anything(),
      "antigravity",
      "Session",
      undefined,
    );
    expect(libMocks.getWindowLockRemainingMs).toHaveBeenCalledWith(
      expect.anything(),
      "antigravity",
      "Claude",
      0,
      undefined,
    );
  });
});
