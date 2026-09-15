import { describe, expect, it } from "vitest"
import type { PaceResult } from "@/lib/pace-status"
import { progressTone } from "@/lib/progress-tone"

const ahead: PaceResult = { status: "ahead", projectedUsage: 60 }
const warningPace: PaceResult = { status: "on-track", projectedUsage: 95 }
const behind: PaceResult = { status: "behind", projectedUsage: 120 }

describe("progressTone", () => {
  it("is critical when the limit is already reached", () => {
    expect(progressTone(100, 100, null)).toBe("critical")
    expect(progressTone(110, 100, ahead)).toBe("critical")
  })

  it("is critical when projected usage exceeds the limit", () => {
    expect(progressTone(80, 100, behind)).toBe("critical")
  })

  it("is warning when projected spare is under 10%", () => {
    expect(progressTone(50, 100, warningPace)).toBe("warning")
  })

  it("is normal when comfortably on pace or pace is unknown", () => {
    expect(progressTone(10, 100, ahead)).toBe("normal")
    expect(progressTone(10, 100, null)).toBe("normal")
    expect(progressTone(10, 100, { status: "ahead", projectedUsage: Number.NaN })).toBe(
      "normal",
    )
  })
})
