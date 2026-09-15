<script lang="ts">
  import type { MetricLine } from "@/lib/plugin-types";
  import type { DisplayMode, ResetTimerDisplayMode } from "@/lib/settings";
  import MetricLineText from "./metric-line-text.svelte";
  import MetricLineProgress from "./metric-line-progress.svelte";

  let {
    line,
    displayMode,
    resetTimerDisplayMode = "relative",
    onResetTimerDisplayModeToggle,
    onDisplayModeToggle,
    now,
    refreshing = false,
    pluginLines = [],
    crossingGoRemainingMs,
  }: {
    line: MetricLine;
    displayMode: DisplayMode;
    resetTimerDisplayMode?: ResetTimerDisplayMode;
    onResetTimerDisplayModeToggle?: () => void;
    onDisplayModeToggle?: () => void;
    now: number;
    refreshing?: boolean;
    pluginLines?: MetricLine[];
    crossingGoRemainingMs?: number;
  } = $props();
</script>

{#if line.type === "text"}
  <MetricLineText line={line} {refreshing} />
{:else if line.type === "progress"}
    <MetricLineProgress
      {line}
      {displayMode}
      {resetTimerDisplayMode}
      {onResetTimerDisplayModeToggle}
      {onDisplayModeToggle}
      {now}
      {refreshing}
      {pluginLines}
      {crossingGoRemainingMs}
    />
{/if}
