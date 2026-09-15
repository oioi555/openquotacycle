import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { makePluginTestContext } from "../test-helpers.js"
import pluginManifest from "./plugin.json"

const loadPlugin = async () => {
  await import("./plugin.js")
  return globalThis.__quotracker_plugin
}

const createCtx = (overrides) => makePluginTestContext(overrides, vi)

describe("mock plugin", () => {
  beforeEach(() => {
    delete globalThis.__quotracker_plugin
    if (vi.resetModules) vi.resetModules()
    vi.useFakeTimers()
    vi.setSystemTime(new Date("2026-02-02T00:00:00.000Z"))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it("ships a 3-channel fixture layout", () => {
    expect(pluginManifest.id).toBe("mock")
    expect(pluginManifest.name).toBe("Mock")
    expect(pluginManifest.lines).toEqual([
      { type: "progress", label: "Session", scope: "overview", visibleByDefault: true },
      { type: "progress", label: "Weekly", scope: "overview", visibleByDefault: true },
      { type: "text", label: "Extra Usage", scope: "overview" },
    ])
  })

  it("returns Session, Weekly, Extra Usage, and one status chip", async () => {
    const plugin = await loadPlugin()
    const result = plugin.probe(createCtx())
    expect(result.plan).toBe("Pro")
    expect(result.lines.map((line) => line.label)).toEqual(["Session", "Weekly", "Extra Usage"])
    expect(result.lines[0]).toMatchObject({
      type: "progress",
      label: "Session",
      used: 40,
      limit: 100,
      format: { kind: "percent" },
      periodDurationMs: 5 * 60 * 60 * 1000,
    })
    expect(result.lines[1]).toMatchObject({
      type: "progress",
      label: "Weekly",
      used: 25,
      limit: 100,
      format: { kind: "percent" },
      periodDurationMs: 7 * 24 * 60 * 60 * 1000,
    })
    expect(result.lines[2]).toEqual({ type: "text", label: "Extra Usage", value: "5 cap" })
    expect(result.statuses).toEqual([{ text: "Peak", tone: "danger" }])
  })

  it("throws on odd minutes instead of emitting an Error badge", async () => {
    vi.setSystemTime(new Date("2026-02-02T00:01:00.000Z"))
    const plugin = await loadPlugin()
    expect(() => plugin.probe(createCtx())).toThrow(
      "Usage request failed (HTTP 429). Try again later.",
    )
  })
})
