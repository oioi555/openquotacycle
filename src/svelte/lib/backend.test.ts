import { beforeEach, describe, expect, it, vi } from "vitest";
import { createBatchId, credentialWakeAvailability, runWindowStarterCli, showDesktopNotification, startProbeBatch, updateGlobalShortcut, wakeAntigravityAgy, wakeCredential } from "./backend";

const invokeMock = vi.hoisted(() => vi.fn());

vi.mock("@tauri-apps/api/core", () => ({
  invoke: (...args: unknown[]) => invokeMock(...args),
  isTauri: () => false,
}));

describe("backend command wrappers", () => {
  beforeEach(() => {
    invokeMock.mockReset();
  });

  it("startProbeBatch passes batchId only when no pluginIds are given", async () => {
    invokeMock.mockResolvedValue({ batchId: "b1", pluginIds: ["claude"] });

    await startProbeBatch("b1");

    expect(invokeMock).toHaveBeenCalledWith("start_probe_batch", { batchId: "b1" });
  });

  it("startProbeBatch forwards pluginIds when provided", async () => {
    invokeMock.mockResolvedValue({ batchId: "b2", pluginIds: ["codex"] });

    const result = await startProbeBatch("b2", ["codex"]);

    expect(invokeMock).toHaveBeenCalledWith("start_probe_batch", {
      batchId: "b2",
      pluginIds: ["codex"],
    });
    expect(result.pluginIds).toEqual(["codex"]);
  });

  it("updateGlobalShortcut forwards the shortcut payload", async () => {
    invokeMock.mockResolvedValue(undefined);

    await updateGlobalShortcut("Ctrl+Shift+Q" as never);

    expect(invokeMock).toHaveBeenCalledWith("update_global_shortcut", {
      shortcut: "Ctrl+Shift+Q",
    });
  });

  it("runWindowStarterCli forwards plugin, runner, window, and prompt", async () => {
    invokeMock.mockResolvedValue({
      providerId: "zai",
      runnerId: "pi",
      windowLine: "Session",
      executable: "pi",
      status: "success",
      exitCode: 0,
      durationMs: 12,
      output: "OK",
      outputTruncated: false,
    });

    await runWindowStarterCli({
      pluginId: "zai",
      runnerId: "pi",
      windowLine: "Session",
      prompt: "ping",
      timeoutSecs: 60,
    });

    expect(invokeMock).toHaveBeenCalledWith("window_starter_run", {
      pluginId: "zai",
      runnerId: "pi",
      windowLine: "Session",
      prompt: "ping",
      timeoutSecs: 60,
    });
  });

  it("wakeAntigravityAgy invokes credential_wake with providerId antigravity", async () => {
    invokeMock.mockResolvedValue({ status: "spawned", durationMs: 7, exitCode: 0 });

    const result = await wakeAntigravityAgy();

    expect(invokeMock).toHaveBeenCalledWith("credential_wake", { providerId: "antigravity" });
    expect(result.status).toBe("spawned");
  });

  it("wakeCredential invokes credential_wake with camelCase providerId", async () => {
    invokeMock.mockResolvedValue({ status: "spawned", durationMs: 3, exitCode: 0 });

    const result = await wakeCredential("grok");

    expect(invokeMock).toHaveBeenCalledWith("credential_wake", { providerId: "grok" });
    expect(result.status).toBe("spawned");
  });

  it("credentialWakeAvailability invokes credential_wake_availability", async () => {
    invokeMock.mockResolvedValue({ antigravity: true, grok: false });

    await expect(credentialWakeAvailability()).resolves.toEqual({
      antigravity: true,
      grok: false,
    });
    expect(invokeMock).toHaveBeenCalledWith("credential_wake_availability");
  });

  it("showDesktopNotification forwards title and body", async () => {
    invokeMock.mockResolvedValue(undefined);

    await showDesktopNotification("Leftover melting", "Claude Session · 58% left · gone in 1h 4m");

    expect(invokeMock).toHaveBeenCalledWith("show_desktop_notification", {
      title: "Leftover melting",
      body: "Claude Session · 58% left · gone in 1h 4m",
    });
  });

  it("createBatchId produces unique identifiers", () => {
    const first = createBatchId();
    const second = createBatchId();

    expect(first).toBeTruthy();
    expect(second).toBeTruthy();
    expect(first).not.toBe(second);
  });
});
