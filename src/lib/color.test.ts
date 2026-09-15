import { describe, expect, it } from "vitest"

import { getIconColor, getRelativeLuminance } from "@/lib/color"

describe("getRelativeLuminance", () => {
  it("returns 0 for invalid hex", () => {
    expect(getRelativeLuminance("nope")).toBe(0)
    expect(getRelativeLuminance("#12")).toBe(0)
    expect(getRelativeLuminance("#gggggg")).toBe(0)
  })

  it("supports 3-digit and 4-digit hex (alpha ignored)", () => {
    const lum3 = getRelativeLuminance("#fff")
    const lum4 = getRelativeLuminance("#ffff")
    expect(lum3).toBeGreaterThan(0.9)
    expect(lum4).toBeGreaterThan(0.9)
  })

  it("ignores alpha in 8-digit hex", () => {
    const lum1 = getRelativeLuminance("#000000ff")
    const lum2 = getRelativeLuminance("#00000000")
    expect(lum1).toBe(0)
    expect(lum2).toBe(0)
  })
})

describe("getIconColor", () => {
  it("returns currentColor when brandColor is undefined", () => {
    expect(getIconColor(undefined, true)).toBe("currentColor")
    expect(getIconColor(undefined, false)).toBe("currentColor")
  })

  it("returns #ffffff in dark theme when brandColor is very dark", () => {
    expect(getIconColor("#000000", true)).toBe("#ffffff")
    expect(getIconColor("#010203", true)).toBe("#ffffff")
  })

  it("returns the brand color in dark theme when it is bright enough", () => {
    expect(getIconColor("#ff8800", true)).toBe("#ff8800")
    expect(getIconColor("#ffffff", true)).toBe("#ffffff")
  })

  it("returns currentColor in light theme when brandColor is very light", () => {
    expect(getIconColor("#ffffff", false)).toBe("currentColor")
    expect(getIconColor("#fefefe", false)).toBe("currentColor")
  })

  it("returns the brand color in light theme when it is dark enough", () => {
    expect(getIconColor("#000000", false)).toBe("#000000")
    expect(getIconColor("#ff8800", false)).toBe("#ff8800")
  })
})

