<script module lang="ts">
  export type TimelineLabelMode = "time" | "month-day";
  export type ResetPlotEmphasis = "next" | "later";
</script>

<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Progress from "../ui/progress.svelte";
  import Tooltip from "../ui/tooltip.svelte";
  import TooltipContent from "../ui/tooltip-content.svelte";
  import TooltipTrigger from "../ui/tooltip-trigger.svelte";
  import type { ProgressTone } from "@/lib/progress-tone";
  import {
    axisOffsetPercent,
    formatLocalHHMM,
    formatLocalMonthDay,
    formatRemainingLabel,
    isOverflow,
  } from "@/lib/quota-timeline/axis";

  let {
    resetsAtIso,
    nowMs,
    providerName,
    quotaLabel,
    quotaReading,
    quotaPercent = 0,
    paceMarkerValue = undefined,
    axisSpanMs,
    labelMode,
    plotColor,
    plotTone,
    emphasis = "next",
  }: {
    resetsAtIso: string;
    nowMs: number;
    providerName: string;
    quotaLabel: string;
    quotaReading: string;
    quotaPercent?: number;
    paceMarkerValue?: number;
    axisSpanMs: number;
    labelMode: TimelineLabelMode;
    plotColor: string;
    plotTone: ProgressTone;
    emphasis?: ResetPlotEmphasis;
  } = $props();

  const resetsAtMs = $derived(Date.parse(resetsAtIso));
  const overflow = $derived(!Number.isNaN(resetsAtMs) && isOverflow(resetsAtMs, nowMs, axisSpanMs));
  const visible = $derived(!Number.isNaN(resetsAtMs) && resetsAtMs > nowMs);
  const leftPct = $derived(axisOffsetPercent(resetsAtMs, nowMs, axisSpanMs));
  const label = $derived(
    labelMode === "month-day" ? formatLocalMonthDay(resetsAtIso) : formatLocalHHMM(resetsAtIso),
  );
  const remaining = $derived(formatRemainingLabel(nowMs, resetsAtIso));
  const isLater = $derived(emphasis === "later");
  const tooltip = $derived(
    isLater
      ? `${providerName} · ${quotaLabel} · resets ${label} · ${remaining}`
      : `${providerName} · ${quotaLabel} · ${quotaReading} · resets ${label} · ${remaining}`,
  );
  const fill = $derived(isLater ? "var(--muted-foreground)" : plotColor);
  const tone = $derived(isLater ? "muted" : plotTone);
  const titleLine = $derived(
    isLater ? `${providerName} · ${quotaLabel}` : `${providerName} · ${quotaLabel} · ${quotaReading}`,
  );
  const ringRadius = 5.5;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringPercent = $derived(Math.min(100, Math.max(0, quotaPercent)));
  const ringArc = $derived((ringPercent / 100) * ringCircumference);
</script>

{#if visible}
  {#if overflow}
    <div
      aria-hidden="true"
      class="pointer-events-none absolute inset-y-0 right-0 flex items-center text-foreground/60"
    >
      <ChevronRight class="h-3.5 w-3.5" />
    </div>
  {:else}
    <Tooltip>
      <TooltipTrigger
        class="absolute top-1/2 z-10 flex size-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
        aria-label={tooltip}
        style={`left: ${leftPct}%`}
      >
        {#if isLater}
          <span
            data-slot="reset-plot"
            data-emphasis={emphasis}
            data-kind="dot"
            data-tone={tone}
            class="block size-2 rounded-full shadow-[0_0_0_2px_var(--card)]"
            style:background-color={fill}
          ></span>
        {:else}
          <svg
            data-slot="reset-plot"
            data-emphasis={emphasis}
            data-kind="ring"
            data-tone={tone}
            data-percent={ringPercent}
            class="size-4 -rotate-90 overflow-visible"
            viewBox="0 0 16 16"
            aria-hidden="true"
            style:color={plotColor}
          >
            <circle cx="8" cy="8" r="8" fill="var(--card)"></circle>
            <circle
              cx="8"
              cy="8"
              r={ringRadius}
              fill="none"
              stroke="var(--meter-track)"
              stroke-width="3"
            ></circle>
            {#if ringPercent > 0}
              <circle
                cx="8"
                cy="8"
                r={ringRadius}
                fill="none"
                stroke="currentColor"
                stroke-width="3"
                stroke-linecap={ringPercent >= 100 ? "butt" : "round"}
                stroke-dasharray={`${ringArc} ${ringCircumference}`}
              ></circle>
            {/if}
          </svg>
        {/if}
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        class={isLater ? "max-w-[220px] text-center leading-snug" : "w-[200px] max-w-[220px] text-left leading-snug"}
      >
        {#if isLater}
          <span class="block">{titleLine}</span>
          <span class="block tabular-nums">{label} · {remaining}</span>
        {:else}
          <span class="block truncate">{providerName} · {quotaLabel}</span>
          <div class="py-2" data-slot="timeline-quota-meter">
            <Progress value={quotaPercent} tone={plotTone} markerValue={paceMarkerValue} />
          </div>
          <div class="flex items-baseline justify-between gap-2 tabular-nums">
            <span>{quotaReading}</span>
            <span class="text-muted-foreground">{label} · {remaining}</span>
          </div>
        {/if}
      </TooltipContent>
    </Tooltip>
  {/if}
{/if}
