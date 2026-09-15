import { describe, expect, it } from "vitest"
import { formatProgressReading, progressShownAmount } from "@/lib/progress-reading"

describe("progressShownAmount", () => {
  it("returns used or remaining according to display mode", () => {
    expect(progressShownAmount(40, 100, "used")).toBe(40)
    expect(progressShownAmount(40, 100, "left")).toBe(60)
  })

  it("clamps remaining at zero when over the limit", () => {
    expect(progressShownAmount(120, 100, "left")).toBe(0)
  })
})

describe("formatProgressReading", () => {
  it("formats percent without a used/left suffix", () => {
    expect(formatProgressReading(40, 100, { kind: "percent" }, "left")).toBe("60%")
    expect(formatProgressReading(40, 100, { kind: "percent" }, "used")).toBe("40%")
  })

  it("formats dollars and counts", () => {
    expect(formatProgressReading(1.5, 10, { kind: "dollars" }, "used")).toBe("$1.50")
    expect(formatProgressReading(20, 100, { kind: "count", suffix: "req" }, "left")).toBe(
      "80 req",
    )
  })
})
