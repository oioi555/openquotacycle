<script lang="ts">
  import House from "@lucide/svelte/icons/house";
  import Settings from "@lucide/svelte/icons/settings";
  import TimerReset from "@lucide/svelte/icons/timer-reset";
  import { appUiController, rootTab, type RootTab } from "../controllers/app-ui-controller.svelte";

  const tabs: { id: RootTab; label: string; Icon: typeof House }[] = [
    { id: "dashboard", label: "Overview", Icon: House },
    { id: "timeline", label: "Timeline", Icon: TimerReset },
    { id: "settings", label: "Settings", Icon: Settings },
  ];

  const selected = $derived(rootTab(appUiController.screen));
</script>

<nav class="shrink-0 border-t px-2 py-1.5" aria-label="Main">
  <div class="grid grid-cols-3 gap-0.5" role="tablist" aria-label="Main">
    {#each tabs as tab (tab.id)}
      {@const on = selected === tab.id}
      <button
        type="button"
        role="tab"
        aria-selected={on}
        aria-label={tab.label}
        class="flex h-[42px] flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium tracking-wide {on
          ? 'bg-foreground/7 text-foreground'
          : 'text-muted-foreground'}"
        onclick={() => appUiController.selectRootTab(tab.id)}
      >
        <tab.Icon class="size-[18px]" aria-hidden="true" />
        {tab.label}
      </button>
    {/each}
  </div>
</nav>
