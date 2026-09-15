<script lang="ts">
  import { axisOffsetPercent, dayTickMsList, WEEKLY_AXIS_SPAN_MS } from "@/lib/quota-timeline/axis";

  let { nowMs }: { nowMs: number } = $props();

  const ticks = $derived(dayTickMsList(nowMs, WEEKLY_AXIS_SPAN_MS));
</script>

<div class="relative h-4 min-w-0 flex-1">
  {#each ticks as tick (tick.ms)}
    <span
      class="absolute top-0 hidden -translate-x-1/2 select-none whitespace-nowrap text-[10px] leading-none text-foreground/60 tabular-nums @[280px]:inline"
      style:left={`${axisOffsetPercent(tick.ms, nowMs, WEEKLY_AXIS_SPAN_MS)}%`}
      aria-hidden="true"
    >
      {tick.day}
    </span>
  {/each}
</div>
