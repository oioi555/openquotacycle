function sRGBtoLinear(c: number) {
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
}

export function getRelativeLuminance(hex: string): number {
  let h = hex.startsWith("#") ? hex.slice(1) : hex
  if (h.length === 3 || h.length === 4) {
    h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2]
  } else if (h.length === 8) {
    h = h.slice(0, 6)
  }
  if (h.length !== 6 || !/^[0-9a-fA-F]{6}$/.test(h)) return 0
  const r = parseInt(h.slice(0, 2), 16) / 255
  const g = parseInt(h.slice(2, 4), 16) / 255
  const b = parseInt(h.slice(4, 6), 16) / 255
  return 0.2126 * sRGBtoLinear(r) + 0.7152 * sRGBtoLinear(g) + 0.0722 * sRGBtoLinear(b)
}

/**
 * Pick a readable icon color for a provider brand color, given the theme.
 *
 * - No brand color → `currentColor` (inherits surrounding text color).
 * - Dark theme + very dark brand → `#ffffff` (avoid disappearing into the bg).
 * - Light theme + very light brand → `currentColor` (avoid disappearing into the bg).
 * - Otherwise → the brand color itself.
 *
 * Used by surfaces that render a provider icon as a CSS mask (the SVG's
 * `currentColor` fill becomes the mask shape, and `backgroundColor` paints
 * it). Dashboard provider cards and the quota-reset timeline rows share this
 * single contrast rule.
 */
export function getIconColor(brandColor: string | undefined, isDark: boolean): string {
  if (!brandColor) return "currentColor"
  const luminance = getRelativeLuminance(brandColor)
  if (isDark && luminance < 0.15) return "#ffffff"
  if (!isDark && luminance > 0.85) return "currentColor"
  return brandColor
}
