<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import TimerReset from "@lucide/svelte/icons/timer-reset";
  import SettingsPluginList from "../components/settings-plugin-list.svelte";
  import Switch from "../components/ui/switch.svelte";
  import { CUSTOMIZE_TIMELINE_ID } from "../controllers/app-ui-controller.svelte";
  import type { SettingsPluginConfig } from "../lib/view-types";

  let {
    plugins = $bindable(),
    onReorder,
    onToggle,
    onOpenDetail,
    timelineCardVisible = true,
    onTimelineCardVisibleChange,
  }: {
    plugins: SettingsPluginConfig[];
    onReorder: (orderedIds: string[]) => void;
    onToggle: (id: string) => void;
    onOpenDetail: (id: string) => void;
    timelineCardVisible?: boolean;
    onTimelineCardVisibleChange?: (visible: boolean) => void;
  } = $props();
</script>

<div class="py-3">
  <div class="ui-list">
    <div
      class="flex cursor-pointer items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/40"
      role="button"
      tabindex={0}
      aria-label="Configure Timeline"
      onclick={() => onOpenDetail(CUSTOMIZE_TIMELINE_ID)}
      onkeydown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onOpenDetail(CUSTOMIZE_TIMELINE_ID);
        }
      }}
    >
      <TimerReset class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm">Timeline</span>
        <span class="block truncate text-[11px] text-muted-foreground">Dashboard card</span>
      </span>
      <span onclick={(e) => e.stopPropagation()} onkeydown={(e) => e.stopPropagation()} role="presentation">
        <Switch
          checked={timelineCardVisible}
          aria-label="Show Timeline on dashboard"
          onCheckedChange={(checked) => onTimelineCardVisibleChange?.(checked)}
        />
      </span>
      <ChevronRight class="size-4 shrink-0 text-muted-foreground" />
    </div>
  </div>
  <div class="ui-list mt-3">
    <SettingsPluginList bind:plugins {onReorder} {onToggle} {onOpenDetail} />
  </div>
</div>
