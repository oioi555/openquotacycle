/** @vitest-environment node */
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("./index.css", import.meta.url), "utf8")

describe("meter tokens", () => {
  it("mixes brand green with muted foreground for fill in both themes", () => {
    const fills = [...css.matchAll(/--meter-fill:\s*([^;]+);/g)].map((match) => match[1])
    expect(fills.length).toBeGreaterThanOrEqual(2)
    for (const fill of fills) {
      expect(fill).toContain("#00e676")
      expect(fill).toContain("var(--muted-foreground)")
      expect(fill).not.toContain("var(--background)")
    }
  })

  it("keeps headroom as unmixed brand green in both themes", () => {
    const rooms = [...css.matchAll(/--meter-headroom:\s*([^;]+);/g)].map((match) =>
      match[1].trim(),
    )
    expect(rooms.length).toBeGreaterThanOrEqual(2)
    for (const room of rooms) {
      expect(room.toLowerCase()).toBe("#00e676")
    }
  })

  it("hatches headroom so leftover melts instead of painting as fill", () => {
    expect(css).toContain("@utility meter-headroom-hatch")
    expect(css).toContain("@utility meter-headroom-hatch-go")
    expect(css).toContain("repeating-linear-gradient")
    expect(css).toMatch(/meter-headroom-hatch[\s\S]*var\(--meter-headroom\)/)
    expect(css).not.toMatch(/meter-headroom-hatch[\s\S]*--meter-warning/)
  })

  it("uses a dedicated dark green glow on light, unmixed headroom on dark", () => {
    const colors = [...css.matchAll(/--meter-headroom-glow-color:\s*([^;]+);/g)].map((match) =>
      match[1].trim().toLowerCase(),
    )
    expect(colors[0]).toBe("#00a152")
    expect(colors[1]).toBe("#00e676")
    expect(css).not.toMatch(/--meter-headroom-glow:[^;]*var\(--foreground\)/)
    expect(css).not.toContain("--meter-go-tick-glow")
    expect(css).not.toContain("@utility meter-go-tick")
  })
})
