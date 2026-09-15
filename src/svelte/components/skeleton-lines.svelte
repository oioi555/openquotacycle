<script lang="ts">
  import Skeleton from "./ui/skeleton.svelte";
  import type { ManifestLine } from "@/lib/plugin-types";
  import { groupLinesByType } from "@/lib/group-lines-by-type";

  let { lines }: { lines: ManifestLine[] } = $props();
</script>

{#snippet skeletonLine(line: ManifestLine)}
  {#if line.type === "progress"}
    <div>
      <div class="flex items-center justify-between gap-2">
        <div class="min-w-0 flex items-center gap-1.5">
          <span class="min-w-0 truncate text-[13px] leading-[17px] font-semibold">{line.label}</span>
          <Skeleton class="h-4 w-8" />
        </div>
        <div class="flex items-center gap-1.5">
          <Skeleton class="h-4 w-10" />
          <Skeleton class="h-4 w-10" />
        </div>
      </div>
      <div class="mt-1 pb-2">
        <Skeleton class="h-[4px] w-full rounded-full" />
      </div>
    </div>
  {:else}
    <div class="flex justify-between items-center h-4.5">
      <span class="text-xs text-muted-foreground">{line.label}</span>
      <Skeleton class="h-3 w-16" />
    </div>
  {/if}
{/snippet}

<div class="space-y-4">
  {#each groupLinesByType(lines) as group}
    {#if group.kind === "text"}
      <div class="space-y-1">
        {#each group.lines as line}
          {@render skeletonLine(line)}
        {/each}
      </div>
    {:else}
      {#each group.lines as line}
        {@render skeletonLine(line)}
      {/each}
    {/if}
  {/each}
</div>
