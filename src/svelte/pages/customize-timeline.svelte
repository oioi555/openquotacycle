<script lang="ts">
  import Switch from "../components/ui/switch.svelte";
  import { TIMELINE_CADENCE_LABEL, TIMELINE_CADENCE_ORDER } from "@/lib/quota-timeline/select";
  import type { TimelineCardRowId } from "@/lib/settings";

  let {
    visibleRows,
    onToggle,
  }: {
    visibleRows: TimelineCardRowId[];
    onToggle: (kind: TimelineCardRowId, visible: boolean) => void;
  } = $props();

  const visible = $derived(new Set(visibleRows));
</script>

<div class="py-3">
  <section aria-label="Timeline dashboard rows">
    <h3 class="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Dashboard card
    </h3>
    <ul aria-label="Timeline row list" class="ui-list divide-y divide-border">
      {#each TIMELINE_CADENCE_ORDER as kind (kind)}
        {@const label = TIMELINE_CADENCE_LABEL[kind]}
        <li class="flex items-center gap-2 px-3 py-2.5 text-sm">
          <span class="flex-1 truncate">{label}</span>
          <Switch
            checked={visible.has(kind)}
            aria-label={`Show ${label} on Timeline card`}
            onCheckedChange={(checked) => onToggle(kind, checked)}
          />
        </li>
      {/each}
    </ul>
  </section>
</div>
