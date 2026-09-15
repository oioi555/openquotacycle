<script lang="ts">
  import { Flame, Timer } from "@lucide/svelte";
  import Progress from "./ui/progress.svelte";
  import Tooltip from "./ui/tooltip.svelte";
  import TooltipContent from "./ui/tooltip-content.svelte";
  import TooltipTrigger from "./ui/tooltip-trigger.svelte";
  import { formatProgressReading, progressShownAmount } from "@/lib/progress-reading";
  import { progressTone } from "@/lib/progress-tone";
  import { clamp01, formatCountNumber, formatFixedPrecisionNumber } from "@/lib/utils";
  import type { MetricLine } from "@/lib/plugin-types";
  import type { DisplayMode, ResetTimerDisplayMode } from "@/lib/settings";
  import {
    CROSSING_GO_REMAINING_MS,
    crossingBudgetRange,
    crossingHeadroom,
    formatCrossingHeadroom,
    isCrossingGo,
  } from "@/lib/crossing-go";
  import { calculateDeficit, calculatePaceStatus } from "@/lib/pace-status";
  import {
    buildPaceDetailText,
    formatDeficitText,
    formatRunsOutFace,
    formatRunsOutText,
    getPaceStatusText,
  } from "@/lib/pace-tooltip";
  import {
    formatResetAbsoluteFace,
    formatResetAbsoluteLabel,
    formatResetRelativeFace,
    formatResetRelativeLabel,
    formatResetTooltipText,
  } from "@/lib/reset-tooltip";

  const FIVE_HOURS_MS = 5 * 60 * 60 * 1000;
  const chipClass =
    "inline-flex items-center gap-0.5 shrink-0 text-[12px] leading-4 tabular-nums text-muted-foreground";

  let {
    line,
    displayMode,
    resetTimerDisplayMode = "relative",
    onResetTimerDisplayModeToggle,
    onDisplayModeToggle,
    now,
    refreshing = false,
    pluginLines = [],
    crossingGoRemainingMs = CROSSING_GO_REMAINING_MS,
  }: {
    line: Extract<MetricLine, { type: "progress" }>;
    displayMode: DisplayMode;
    resetTimerDisplayMode?: ResetTimerDisplayMode;
    onResetTimerDisplayModeToggle?: () => void;
    onDisplayModeToggle?: () => void;
    now: number;
    refreshing?: boolean;
    pluginLines?: MetricLine[];
    crossingGoRemainingMs?: number;
  } = $props();

  const resetsAtMs = $derived(line.resetsAt ? Date.parse(line.resetsAt) : Number.NaN);
  const periodDurationMs = $derived(line.periodDurationMs);
  const hasParseableReset = $derived(Number.isFinite(resetsAtMs));
  const isUnstartedFiveHour = $derived(
    periodDurationMs === FIVE_HOURS_MS && !hasParseableReset,
  );
  const hasPaceContext = $derived(hasParseableReset && Number.isFinite(periodDurationMs));
  const hasTimeMarkerContext = $derived(hasPaceContext && (periodDurationMs ?? 0) > 0);

  const shownAmount = $derived(progressShownAmount(line.used, line.limit, displayMode));
  const percent = $derived(Math.round(clamp01(shownAmount / line.limit) * 10000) / 100);
  // displayMode is global, so do not repeat "left"/"used" on every line.
  const primaryText = $derived(
    formatProgressReading(line.used, line.limit, line.format, displayMode),
  );

  const resetLabel = $derived(
    hasParseableReset && line.resetsAt
      ? resetTimerDisplayMode === "absolute"
        ? formatResetAbsoluteLabel(now, line.resetsAt)
        : formatResetRelativeLabel(now, line.resetsAt)
      : null,
  );
  const resetFace = $derived(
    hasParseableReset && line.resetsAt
      ? resetTimerDisplayMode === "absolute"
        ? formatResetAbsoluteFace(now, line.resetsAt)
        : formatResetRelativeFace(now, line.resetsAt)
      : null,
  );
  const resetTooltipText = $derived(
    hasParseableReset && line.resetsAt
      ? formatResetTooltipText({
          nowMs: now,
          resetsAtIso: line.resetsAt,
          visibleMode: resetTimerDisplayMode,
        })
      : null,
  );

  const capLabel = $derived(
    line.format.kind === "percent"
      ? `${line.limit}% cap`
      : line.format.kind === "dollars"
        ? `$${formatFixedPrecisionNumber(line.limit)} limit`
        : `${formatCountNumber(line.limit)} ${line.format.suffix}`,
  );
  const fallbackTimeText = $derived(
    isUnstartedFiveHour ? "Not started" : resetFace ? null : capLabel,
  );

  const paceResult = $derived(
    hasPaceContext
      ? calculatePaceStatus(line.used, line.limit, resetsAtMs, periodDurationMs!, now)
      : null,
  );
  const paceStatus = $derived(paceResult?.status ?? null);
  // Elapsed-time tick is independent of ahead/on-track/behind. Hide only
  // when the clock is outside the window (no "now" to plot).
  const paceMarkerValue = $derived.by(() => {
    if (!hasTimeMarkerContext || periodDurationMs == null) return undefined;
    const periodStartMs = resetsAtMs - periodDurationMs;
    const elapsedMs = now - periodStartMs;
    if (elapsedMs <= 0 || now >= resetsAtMs) return undefined;
    const elapsedPercent = clamp01(elapsedMs / periodDurationMs) * 100;
    return displayMode === "used" ? elapsedPercent : 100 - elapsedPercent;
  });
  const isLimitReached = $derived(line.used >= line.limit);
  const tone = $derived(progressTone(line.used, line.limit, paceResult));
  const paceDetailText = $derived(
    hasPaceContext && !isLimitReached
      ? buildPaceDetailText({
          paceResult,
          used: line.used,
          limit: line.limit,
          periodDurationMs: periodDurationMs!,
          resetsAtMs,
          nowMs: now,
          displayMode,
        })
      : null,
  );

  const deficit = $derived(
    hasPaceContext && !isLimitReached
      ? calculateDeficit(line.used, line.limit, resetsAtMs, periodDurationMs!, now)
      : null,
  );
  const deficitText = $derived(
    deficit !== null ? formatDeficitText(deficit, line.format, displayMode) : null,
  );
  const runsOutText = $derived(
    hasPaceContext && !isLimitReached
      ? formatRunsOutText({
          paceResult,
          used: line.used,
          limit: line.limit,
          periodDurationMs: periodDurationMs!,
          resetsAtMs,
          nowMs: now,
        })
      : null,
  );
  const runsOutFace = $derived(
    hasPaceContext && !isLimitReached
      ? formatRunsOutFace({
          paceResult,
          used: line.used,
          limit: line.limit,
          periodDurationMs: periodDurationMs!,
          resetsAtMs,
          nowMs: now,
        })
      : null,
  );
  const showRunOutChip = $derived(isLimitReached || runsOutFace !== null);
  const paceExtraLines = $derived(
    [deficitText, runsOutText].filter((text): text is string => text !== null),
  );
  const paceStatusText = $derived(paceStatus ? getPaceStatusText(paceStatus) : null);
  const crossingGo = $derived(isCrossingGo(line, pluginLines, now, crossingGoRemainingMs));
  const headroom = $derived(crossingHeadroom(line, now));
  const headroomText = $derived(
    headroom ? formatCrossingHeadroom(headroom.headroomPct, crossingGo) : null,
  );
  const budgetRange = $derived(
    headroom ? crossingBudgetRange(headroom, displayMode, crossingGo) : null,
  );
  const resetAriaLabel = $derived(
    resetLabel && headroomText ? `${resetLabel}. ${headroomText}` : resetLabel,
  );
</script>

<div data-refreshing={refreshing ? "true" : undefined}>
  <div class="flex items-center justify-between gap-2">
    <div class="min-w-0 flex items-center gap-1.5">
      <span class="min-w-0 truncate text-[13px] leading-[17px] font-semibold" title={line.label}>
        {line.label}
      </span>
      {#if onDisplayModeToggle}
        <button
          type="button"
          data-slot="progress-reading"
          onclick={onDisplayModeToggle}
          title="Toggle used / left"
          class="ui-pressable shrink-0 text-[12px] leading-4 font-medium tabular-nums text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          {primaryText}
        </button>
      {:else}
        <span
          data-slot="progress-reading"
          class="shrink-0 text-[12px] leading-4 font-medium tabular-nums text-muted-foreground"
        >
          {primaryText}
        </span>
      {/if}
    </div>
    <div class="flex items-center gap-1.5 shrink-0">
      {#if showRunOutChip}
        <Tooltip>
          <TooltipTrigger
            data-slot="run-out-chip"
            class="{chipClass} cursor-default"
            aria-label={isLimitReached ? "Limit reached" : (runsOutText ?? undefined)}
          >
            <Flame class="size-3" size={12} />
            {#if runsOutFace}{runsOutFace}{/if}
          </TooltipTrigger>
          <TooltipContent side="top" class="text-xs text-center">
            {#if isLimitReached}
              Limit reached
            {:else}
              <div>{paceStatusText}</div>
              {#if paceDetailText}
                <div class="text-[10px] opacity-60">{paceDetailText}</div>
              {/if}
              {#each paceExtraLines as extraLine}
                <div class="text-[10px] opacity-60">{extraLine}</div>
              {/each}
            {/if}
          </TooltipContent>
        </Tooltip>
      {/if}
      {#if resetFace && resetLabel}
        {#if resetTooltipText}
          <Tooltip>
            <TooltipTrigger
              data-slot="reset-chip"
              class="{chipClass} {onResetTimerDisplayModeToggle
                ? 'ui-pressable hover:text-foreground transition-colors cursor-pointer'
                : 'cursor-default'}"
              aria-label={resetAriaLabel ?? undefined}
              onclick={onResetTimerDisplayModeToggle}
            >
              <Timer class="size-3" size={12} />
              {resetFace}
            </TooltipTrigger>
            <TooltipContent side="top" class="text-xs text-center">
              <div>{resetTooltipText}</div>
              {#if headroomText}
                <div class="text-[10px] opacity-60">{headroomText}</div>
              {/if}
            </TooltipContent>
          </Tooltip>
        {:else if onResetTimerDisplayModeToggle}
          <button
            type="button"
            data-slot="reset-chip"
            onclick={onResetTimerDisplayModeToggle}
            aria-label={resetAriaLabel ?? undefined}
            class="{chipClass} ui-pressable hover:text-foreground transition-colors cursor-pointer"
          >
            <Timer class="size-3" size={12} />
            {resetFace}
          </button>
        {:else}
          <span data-slot="reset-chip" class={chipClass}>
            <Timer class="size-3" size={12} />
            {resetFace}
          </span>
        {/if}
      {:else if fallbackTimeText}
        <span data-slot="reset-chip" class={chipClass}>{fallbackTimeText}</span>
      {/if}
    </div>
  </div>
  <div class="mt-1 pb-2">
    <Progress
      value={percent}
      {tone}
      markerValue={paceMarkerValue}
      markerEmphasis={crossingGo ? "go" : "idle"}
      budgetStart={budgetRange?.start}
      budgetEnd={budgetRange?.end}
      budgetEmphasis={crossingGo ? "go" : "idle"}
      {refreshing}
    />
  </div>
</div>
