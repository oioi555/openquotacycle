<script lang="ts">
  import { dndzone } from "svelte-dnd-action";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import GripVertical from "@lucide/svelte/icons/grip-vertical";
  import Switch from "./ui/switch.svelte";
  import { darkModeController } from "../hooks/use-dark-mode.svelte";
  import { getIconColor } from "@/lib/color";
  import type { SettingsPluginConfig } from "../lib/view-types";

  let {
    plugins = $bindable(),
    onReorder,
    onToggle,
    onOpenDetail,
  }: {
    plugins: SettingsPluginConfig[];
    onReorder: (orderedIds: string[]) => void;
    onToggle: (id: string) => void;
    onOpenDetail: (id: string) => void;
  } = $props();

  function handleFinalize(event: CustomEvent<{ items: SettingsPluginConfig[] }>): void {
    plugins = event.detail.items;
    onReorder(event.detail.items.map((plugin) => plugin.id));
  }

  function handleConsider(event: CustomEvent<{ items: SettingsPluginConfig[] }>): void {
    // svelte-dnd-action inserts a shadow item while dragging. Keep the host
    // list in sync with that temporary state so the action can reconcile the
    // DOM safely when the drag ends.
    plugins = event.detail.items;
  }

  const isDark = $derived(darkModeController.isDark);
</script>

<ul
  class="divide-y divide-border"
  use:dndzone={{
    items: plugins,
    flipDurationMs: 0,
    dropTargetStyle: {},
  }}
  onconsider={handleConsider}
  onfinalize={handleFinalize}
>
  {#each plugins as plugin (plugin.id)}
    <div data-settings-row={plugin.id}>
      <div
        class="flex items-center gap-3 px-3 py-2.5 cursor-pointer hover:bg-muted/40 transition-colors {plugin.enabled
          ? ''
          : 'opacity-55'}"
        role="button"
        tabindex={0}
        aria-label={`Configure ${plugin.name}`}
        onclick={() => onOpenDetail(plugin.id)}
        onkeydown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenDetail(plugin.id);
          }
        }}
      >
        <button
          type="button"
          onclick={(e) => e.stopPropagation()}
          onkeydown={(e) => e.stopPropagation()}
          class="touch-none cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground transition-colors"
          aria-label={`Reorder ${plugin.name}`}
        >
          <GripVertical class="h-4 w-4" />
        </button>

        <span class="flex flex-1 min-w-0 items-center gap-2 {!plugin.enabled && 'text-muted-foreground'}">
          {#if plugin.iconUrl}
            <span
              role="img"
              aria-label={plugin.name}
              class="size-4 inline-block shrink-0"
              style:background-color={getIconColor(plugin.brandColor, isDark)}
              style:-webkit-mask-image={`url(${plugin.iconUrl})`}
              style:-webkit-mask-size="contain"
              style:-webkit-mask-repeat="no-repeat"
              style:-webkit-mask-position="center"
              style:mask-image={`url(${plugin.iconUrl})`}
              style:mask-size="contain"
              style:mask-repeat="no-repeat"
              style:mask-position="center"
            ></span>
          {/if}
          <span class="flex-1 min-w-0">
            <span class="block truncate text-sm">
              {plugin.name}
            </span>
            <span class="block text-[11px] text-muted-foreground">
              {plugin.overviewProgressBars.length} metrics
            </span>
          </span>
        </span>

        <span onclick={(e) => e.stopPropagation()} role="presentation">
          <Switch
            checked={plugin.enabled}
            aria-label={`Enable ${plugin.name}`}
            onCheckedChange={(checked) => {
              if (checked !== plugin.enabled) onToggle(plugin.id);
            }}
          />
        </span>

        <ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
      </div>
    </div>
  {/each}
</ul>
