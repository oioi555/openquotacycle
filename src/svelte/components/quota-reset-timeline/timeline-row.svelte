<script lang="ts">
  import { getIconColor } from "@/lib/color";
  import { calculatePaceStatus } from "@/lib/pace-status";
  import { formatProgressReading, progressShownAmount } from "@/lib/progress-reading";
  import { PROGRESS_TONE_FILL, progressTone } from "@/lib/progress-tone";
  import { computeUpcomingResets } from "@/lib/quota-timeline/axis";
  import type { QuotaTimelineRow } from "@/lib/quota-timeline/select";
  import { clamp01 } from "@/lib/utils";
  import { appPreferencesController } from "../../controllers/app-preferences-controller.svelte";
  import ResetMarker, { type TimelineLabelMode } from "./reset-marker.svelte";

  let {
    row,
    nowMs,
    isDark,
    axisSpanMs,
    labelMode,
  }: {
    row: QuotaTimelineRow;
    nowMs: number;
    isDark: boolean;
    axisSpanMs: number;
    labelMode: TimelineLabelMode;
  } = $props();

  const meta = $derived(row.plugin.meta);
  const line = $derived(row.line);
  const iconColor = $derived(getIconColor(meta.brandColor, isDark));
  const displayMode = $derived(appPreferencesController.displayMode);
  const quotaReading = $derived(
    formatProgressReading(line.used, line.limit, line.format, displayMode),
  );
  const quotaPercent = $derived(
    Math.round(
      clamp01(progressShownAmount(line.used, line.limit, displayMode) / line.limit) * 10000,
    ) / 100,
  );
  const paceResult = $derived(
    calculatePaceStatus(
      line.used,
      line.limit,
      Date.parse(line.resetsAt),
      line.periodDurationMs,
      nowMs,
    ),
  );
  const plotTone = $derived(progressTone(line.used, line.limit, paceResult));
  const plotColor = $derived(PROGRESS_TONE_FILL[plotTone]);
  const paceMarkerValue = $derived.by(() => {
    const resetsAtMs = Date.parse(line.resetsAt);
    const period = line.periodDurationMs;
    if (!Number.isFinite(resetsAtMs) || !Number.isFinite(period) || period <= 0) return undefined;
    const elapsedMs = nowMs - (resetsAtMs - period);
    if (elapsedMs <= 0 || nowMs >= resetsAtMs) return undefined;
    const elapsedPercent = clamp01(elapsedMs / period) * 100;
    return displayMode === "used" ? elapsedPercent : 100 - elapsedPercent;
  });
  const resets = $derived(
    computeUpcomingResets(line.resetsAt, line.periodDurationMs, nowMs, axisSpanMs),
  );
</script>

<!-- Label column w-28 must match the section tick spacer and plot grid. -->
<div class="flex h-8 items-center gap-2">
  <div
    class="flex w-28 min-w-0 shrink-0 items-center gap-1.5"
    title={`${meta.name} · ${line.label} · ${quotaReading}`}
  >
    <span
      aria-hidden="true"
      class="inline-block size-4 shrink-0"
      style:background-color={iconColor}
      style:-webkit-mask-image={`url(${meta.iconUrl})`}
      style:-webkit-mask-size="contain"
      style:-webkit-mask-repeat="no-repeat"
      style:-webkit-mask-position="center"
      style:mask-image={`url(${meta.iconUrl})`}
      style:mask-size="contain"
      style:mask-repeat="no-repeat"
      style:mask-position="center"
    ></span>
    <div class="min-w-0 flex-1 leading-tight">
      <span class="block truncate text-xs text-foreground/80">{meta.name}</span>
      <span class="block truncate text-[10px] text-foreground/50">{line.label}</span>
    </div>
  </div>
  <div class="relative h-full min-w-0 flex-1">
    <div
      data-slot="timeline-lane"
      aria-hidden="true"
      class="pointer-events-none absolute inset-x-0 top-1/2 h-[4px] -translate-y-1/2 rounded-full bg-meter-track"
    ></div>
    {#if resets.length > 0}
      {#each resets as r, index (r.ms)}
        <ResetMarker
          resetsAtIso={r.iso}
          {nowMs}
          providerName={meta.name}
          quotaLabel={line.label}
          {quotaReading}
          {quotaPercent}
          {paceMarkerValue}
          {axisSpanMs}
          {labelMode}
          {plotColor}
          {plotTone}
          emphasis={index === 0 ? "next" : "later"}
        />
      {/each}
    {:else}
      <ResetMarker
        resetsAtIso={line.resetsAt}
        {nowMs}
        providerName={meta.name}
        quotaLabel={line.label}
        {quotaReading}
        {quotaPercent}
        {paceMarkerValue}
        {axisSpanMs}
        {labelMode}
        {plotColor}
        {plotTone}
      />
    {/if}
  </div>
</div>
