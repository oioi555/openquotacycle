<script lang="ts">
  import { PROGRESS_TONE_FILL, type ProgressTone } from "@/lib/progress-tone";
  import { cn } from "@/lib/utils";

  export type { ProgressTone };

  let {
    class: className = undefined,
    value = 0,
    tone = "normal",
    markerValue = undefined,
    markerEmphasis = "idle",
    budgetStart = undefined,
    budgetEnd = undefined,
    budgetEmphasis = "idle",
    refreshing = false,
    ...rest
  }: {
    class?: string;
    value?: number;
    tone?: ProgressTone;
    markerValue?: number;
    markerEmphasis?: "idle" | "go";
    budgetStart?: number;
    budgetEnd?: number;
    budgetEmphasis?: "idle" | "go";
    refreshing?: boolean;
    [key: string]: unknown;
  } = $props();

  const clamped = $derived(Math.min(100, Math.max(0, value)));
  const clampedMarker = $derived(
    typeof markerValue === "number" && Number.isFinite(markerValue)
      ? Math.min(100, Math.max(0, markerValue))
      : null,
  );
  const showMarker = $derived(clampedMarker !== null);
  const budgetLeft = $derived(
    typeof budgetStart === "number" && Number.isFinite(budgetStart)
      ? Math.min(100, Math.max(0, budgetStart))
      : null,
  );
  const budgetRight = $derived(
    typeof budgetEnd === "number" && Number.isFinite(budgetEnd)
      ? Math.min(100, Math.max(0, budgetEnd))
      : null,
  );
  const budgetWidth = $derived(
    budgetLeft !== null && budgetRight !== null && budgetRight > budgetLeft
      ? budgetRight - budgetLeft
      : null,
  );
  // Headroom leftover melts at reset — clip solid fill so only the hatch
  // paints that slice (left mode otherwise draws leftover as fill).
  const fillWidth = $derived(
    budgetLeft !== null && budgetLeft < clamped ? budgetLeft : clamped,
  );
  const markerTransform = $derived(
    clampedMarker === null
      ? undefined
      : clampedMarker <= 0
        ? "translateX(0)"
        : clampedMarker >= 100
          ? "translateX(-100%)"
          : "translateX(-50%)",
  );
</script>

<div
  role="progressbar"
  aria-valuenow={clamped}
  aria-valuemin={0}
  aria-valuemax={100}
  class={cn("relative h-[4px] w-full rounded-full bg-meter-track", className)}
  {...rest}
>
  <div
    class="h-full rounded-full transition-all"
    style:width={`${fillWidth}%`}
    style:min-width={fillWidth > 0 ? "4px" : "0"}
    style:background-color={PROGRESS_TONE_FILL[tone]}
  ></div>
  {#if budgetLeft !== null && budgetWidth !== null}
    <div
      data-slot="progress-headroom"
      data-crossing-go={budgetEmphasis === "go" ? "true" : undefined}
      aria-hidden="true"
      class="absolute top-0 z-[1] h-full pointer-events-none {budgetEmphasis === 'go'
        ? 'meter-headroom-hatch-go'
        : 'meter-headroom-hatch'}"
      style:left={`${budgetLeft}%`}
      style:width={`${budgetWidth}%`}
    ></div>
  {/if}
  {#if showMarker}
    <div
      data-slot="progress-marker"
      data-crossing-go={markerEmphasis === "go" ? "true" : undefined}
      aria-hidden="true"
      class="absolute z-10 pointer-events-none rounded-[1px] {markerEmphasis === 'go'
        ? 'w-[4px] h-[16px] bg-meter-fill opacity-100'
        : 'w-[2px] h-[12px] bg-foreground opacity-60'}"
      style:top={markerEmphasis === "go" ? "-6px" : "-4px"}
      style:left={`${clampedMarker}%`}
      style:transform={markerTransform}
    ></div>
  {/if}
  <!-- Always mounted; fades so the sweep doesn't pop in/out on refresh start/stop. -->
  <div
    data-slot="progress-refreshing"
    aria-hidden="true"
    class="absolute inset-0 overflow-hidden rounded-full transition-opacity duration-200 {refreshing
      ? 'opacity-100'
      : 'opacity-0'}"
  >
    {#if refreshing}
      <div class="h-full w-full animate-shimmer bg-linear-to-r from-transparent via-white/20 to-transparent"></div>
    {/if}
  </div></div>
