import type { ProgressFormat } from "@/lib/plugin-types"
import type { DisplayMode } from "@/lib/settings"
import { formatCountNumber, formatFixedPrecisionNumber } from "@/lib/utils"

export function progressShownAmount(
  used: number,
  limit: number,
  displayMode: DisplayMode,
): number {
  return displayMode === "used" ? used : Math.max(0, limit - used)
}

/** Suffix-free used/left reading, same face as Overview progress lines. */
export function formatProgressReading(
  used: number,
  limit: number,
  format: ProgressFormat,
  displayMode: DisplayMode,
): string {
  const shown = progressShownAmount(used, limit, displayMode)
  if (format.kind === "percent") return `${Math.round(shown)}%`
  if (format.kind === "dollars") return `$${formatFixedPrecisionNumber(shown)}`
  return `${formatCountNumber(shown)} ${format.suffix}`
}
