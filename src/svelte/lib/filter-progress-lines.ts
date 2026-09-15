import type { ManifestLine } from "@/lib/plugin-types";

// Overview visibility filtering (overview-metrics spec): progress and text
// lines listed in the hidden set are classified On-Demand. No line is mandatory.
export function filterProgressLines<T extends { type: string; label: string }>(
  lines: T[],
  hiddenLabels: Set<string>,
): T[] {
  return lines.filter((line) => {
    if (line.type !== "progress" && line.type !== "text") return true;
    return !hiddenLabels.has(line.label);
  });
}

/** Order lines by stored label order (align-ui-with-openusage-v07); labels
 * missing from the stored order keep their incoming relative order at the end. */
export function orderLinesByLabels<T extends { label: string }>(
  lines: T[],
  order: string[],
): T[] {
  if (order.length === 0) return lines;
  const orderIndex = new Map(order.map((label, index) => [label, index]));
  return [...lines].sort(
    (a, b) =>
      (orderIndex.get(a.label) ?? order.length) -
      (orderIndex.get(b.label) ?? order.length),
  );
}

// Overview lines are matched by label, since runtime lines can differ from the
// manifest declaration.
export function overviewScopeFilter(
  lines: ManifestLine[],
): Set<string> {
  return new Set(
    lines.filter((line) => line.scope === "overview").map((line) => line.label),
  );
}
