<script lang="ts">
  import type { MetricLine } from "@/lib/plugin-types";

  let {
    line,
    refreshing = false,
  }: {
    line: Extract<MetricLine, { type: "text" }>;
    refreshing?: boolean;
  } = $props();
</script>

<div data-refreshing={refreshing ? "true" : undefined}>
  <div class="flex justify-between items-center h-4.5">
    <span class="text-xs text-muted-foreground shrink-0">{line.label}</span>
    <span
      class="text-xs text-muted-foreground truncate min-w-0 max-w-[60%] text-right"
      style:color={line.color}
      title={line.value}
    >
      {line.value}
    </span>
  </div>
  {#if line.subtitle}
    <div class="text-[10px] text-muted-foreground text-right -mt-0.5">{line.subtitle}</div>
  {/if}
</div>
