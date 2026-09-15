<script lang="ts">
  import { dndzone } from "svelte-dnd-action";

  let {
    items = $bindable(),
    onFinalize,
  }: {
    items: { id: string; name: string }[];
    onFinalize?: (items: { id: string; name: string }[]) => void;
  } = $props();
</script>

<ul
  use:dndzone={{
    items,
    flipDurationMs: 0,
    dropTargetStyle: {},
  }}
  onfinalize={(event) => {
    items = event.detail.items;
    onFinalize?.(event.detail.items);
  }}
  data-testid="settings-dnd-list"
>
  {#each items as item (item.id)}
    <li data-settings-row={item.id}>{item.name}</li>
  {/each}
</ul>
