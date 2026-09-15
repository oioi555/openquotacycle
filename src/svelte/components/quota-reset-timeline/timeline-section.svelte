<script lang="ts">
  import {
    axisOffsetPercent,
    dayTickMsList,
    hourTickMsList,
  } from "@/lib/quota-timeline/axis";
  import type { QuotaTimelineKind, QuotaTimelineRow } from "@/lib/quota-timeline/select";
  import DayTicks from "./day-ticks.svelte";
  import HourTicks from "./hour-ticks.svelte";
  import NowLine from "./now-line.svelte";
  import type { TimelineLabelMode } from "./reset-marker.svelte";
  import TimelineRow from "./timeline-row.svelte";

  let {
    title,
    kind,
    rows,
    nowMs,
    isDark,
    axisSpanMs,
    labelMode,
  }: {
    title: string;
    kind: QuotaTimelineKind;
    rows: QuotaTimelineRow[];
    nowMs: number;
    isDark: boolean;
    axisSpanMs: number;
    labelMode: TimelineLabelMode;
  } = $props();

  const spanLabel = $derived(kind === "five-hour" ? "next 12h" : "next 14d");
  const gridTicks = $derived(
    kind === "five-hour"
      ? hourTickMsList(nowMs, axisSpanMs).map((tick) => tick.ms)
      : dayTickMsList(nowMs, axisSpanMs).map((tick) => tick.ms),
  );
</script>

{#if rows.length > 0}
  <section aria-label={`${title} quota reset timeline`} class="ui-card-bordered overflow-hidden">
    <div class="flex items-center justify-between gap-2 border-b border-border/60 px-3 py-2">
      <h2 class="text-sm font-semibold">{title}</h2>
      <div class="flex shrink-0 items-center gap-2">
        <span
          class="rounded-full bg-muted px-2 py-0.5 text-[11px] tabular-nums text-muted-foreground"
        >
          {spanLabel}
        </span>
        <span class="text-xs tabular-nums text-muted-foreground">{rows.length}</span>
      </div>
    </div>
    <div class="flex flex-col gap-0 px-3 py-2">
      <div class="flex gap-2">
        <div class="w-28 shrink-0"></div>
        {#if kind === "five-hour"}
          <HourTicks {nowMs} />
        {:else}
          <DayTicks {nowMs} />
        {/if}
      </div>
      <div class="relative">
        <div
          data-slot="timeline-grid"
          class="pointer-events-none absolute inset-0 flex gap-2"
          aria-hidden="true"
        >
          <div class="w-28 shrink-0"></div>
          <div class="relative min-w-0 flex-1">
            <NowLine />
            {#each gridTicks as tickMs (tickMs)}
              <div
                class="absolute inset-y-0 w-px bg-foreground/12"
                style:left={`${axisOffsetPercent(tickMs, nowMs, axisSpanMs)}%`}
              ></div>
            {/each}
          </div>
        </div>
        {#each rows as row, index (row.plugin.meta.id + row.line.label + index)}
          <TimelineRow {row} {nowMs} {isDark} {axisSpanMs} {labelMode} />
        {/each}
      </div>
    </div>
  </section>
{/if}
