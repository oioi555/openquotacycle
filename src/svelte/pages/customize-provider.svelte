<script lang="ts">
  import { onDestroy } from "svelte";
  import { dndzone, type DndEvent } from "svelte-dnd-action";
  import Check from "@lucide/svelte/icons/check";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import Copy from "@lucide/svelte/icons/copy";
  import GripVertical from "@lucide/svelte/icons/grip-vertical";
  import Button from "../components/ui/button.svelte";
  import DropdownMenu from "../components/ui/dropdown-menu.svelte";
  import DropdownMenuContent from "../components/ui/dropdown-menu-content.svelte";
  import DropdownMenuItem from "../components/ui/dropdown-menu-item.svelte";
  import DropdownMenuTrigger from "../components/ui/dropdown-menu-trigger.svelte";
  import Switch from "../components/ui/switch.svelte";
  import type { SettingsPluginConfig } from "../lib/view-types";
  import {
    createWindowStarterPrompt,
    getWindowStarterCommand,
    WINDOW_STARTER_RUNNER_LABELS,
  } from "@/lib/window-starter-state";

  let {
    plugin,
    onToggleOverviewProgressBar,
    onOverviewLineReorder,
    onWindowStarterParticipation,
    onWindowStarterWindow,
    onWindowStarterRunner,
    onAntigravityAgyAutoWake,
    onGrokAutoWake,
  }: {
    plugin: SettingsPluginConfig;
    onToggleOverviewProgressBar: (pluginId: string, label: string, visible: boolean) => void;
    onOverviewLineReorder: (pluginId: string, orderedLabels: string[]) => void;
    onWindowStarterParticipation?: (pluginId: string, enabled: boolean) => void;
    onWindowStarterWindow?: (pluginId: string, windowId: string, enabled: boolean) => void;
    onWindowStarterRunner?: (pluginId: string, runnerId: string) => void;
    onAntigravityAgyAutoWake?: (enabled: boolean) => void;
    onGrokAutoWake?: (enabled: boolean) => void;
  } = $props();

  function runnerLabel(runnerId: string): string {
    return WINDOW_STARTER_RUNNER_LABELS[runnerId] ?? runnerId;
  }

  type ProgressBarItem = SettingsPluginConfig["overviewProgressBars"][number] & {
    id: string;
  };

  function itemsFromPlugin(): ProgressBarItem[] {
    return plugin.overviewProgressBars.map((bar) => ({ ...bar, id: bar.label }));
  }

  function isStoredChecked(label: string): boolean {
    return plugin.overviewProgressBars.find((bar) => bar.label === label)?.checked ?? true;
  }

  let alwaysBars = $state<ProgressBarItem[]>(itemsFromPlugin().filter((bar) => bar.checked));
  let demandBars = $state<ProgressBarItem[]>(itemsFromPlugin().filter((bar) => !bar.checked));
  let dragging = $state(false);
  let copied = $state(false);
  let copyTimer: ReturnType<typeof setTimeout> | undefined;

  onDestroy(() => clearTimeout(copyTimer));

  function copyRunnerCommand(): void {
    const starter = plugin.windowStarter;
    if (!starter) return;
    const text = getWindowStarterCommand(
      plugin.id,
      starter.runnerId,
      starter.windows[0]?.id ?? "",
      createWindowStarterPrompt(),
    );
    const write = navigator.clipboard?.writeText
      ? navigator.clipboard.writeText(text)
      : Promise.reject(new Error("clipboard unavailable"));
    write
      .then(() => {
        copied = true;
        clearTimeout(copyTimer);
        copyTimer = setTimeout(() => {
          copied = false;
        }, 1500);
      })
      .catch((error) => {
        console.error("Failed to copy Window Starter command:", error);
      });
  }

  // Keep both zones synchronized with prop changes while leaving the dnd
  // zones' shadow-item lists untouched during an active drag.
  $effect(() => {
    if (dragging) return;
    const items = itemsFromPlugin();
    alwaysBars = items.filter((bar) => bar.checked);
    demandBars = items.filter((bar) => !bar.checked);
  });

  function handleConsider(
    zone: "always" | "demand",
    event: CustomEvent<DndEvent<ProgressBarItem>>,
  ): void {
    dragging = true;
    // svelte-dnd-action inserts a shadow item while dragging. Keep the host
    // list in sync with that temporary state so the action can reconcile the
    // DOM safely when the drag ends.
    if (zone === "always") alwaysBars = event.detail.items;
    else demandBars = event.detail.items;
  }

  function handleFinalize(
    zone: "always" | "demand",
    event: CustomEvent<DndEvent<ProgressBarItem>>,
  ): void {
    if (zone === "always") alwaysBars = event.detail.items;
    else demandBars = event.detail.items;
    dragging = false;
    // Reclassify rows that crossed zones, then persist the combined order.
    for (const bar of alwaysBars) {
      if (!isStoredChecked(bar.label)) onToggleOverviewProgressBar(plugin.id, bar.label, true);
    }
    for (const bar of demandBars) {
      if (isStoredChecked(bar.label)) onToggleOverviewProgressBar(plugin.id, bar.label, false);
    }
    const prevOrder = itemsFromPlugin().map((bar) => bar.label);
    const nextOrder = [...alwaysBars, ...demandBars].map((bar) => bar.label);
    if (nextOrder.join("\0") !== prevOrder.join("\0")) {
      onOverviewLineReorder(plugin.id, nextOrder);
    }
  }
</script>

<div class="py-3 space-y-4">
  <section aria-label="Always visible metrics">
    <h3 class="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      Always Visible
    </h3>
    <ul
      aria-label="Always visible metric list"
      class="ui-list divide-y divide-border"
      use:dndzone={{ items: alwaysBars, flipDurationMs: 0, dropTargetStyle: {} }}
      onconsider={(event) => handleConsider("always", event)}
      onfinalize={(event) => handleFinalize("always", event)}
    >
      {#each alwaysBars as bar (bar.id)}
        <li
          data-overview-line={bar.label}
          class="flex items-center gap-2 px-3 py-2.5 text-sm"
        >
          <span
            class="cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical class="h-4 w-4" />
          </span>
          <span class="flex-1 truncate">{bar.label}</span>
          <Switch
            checked={bar.checked}
            aria-label={`Show ${bar.label} on Overview`}
            onCheckedChange={(checked) => {
              onToggleOverviewProgressBar(plugin.id, bar.label, checked);
            }}
          />
        </li>
      {/each}
      {#if alwaysBars.length === 0}
        <li class="px-3 py-3 text-sm text-muted-foreground">Empty — drag rows here to pin them.</li>
      {/if}
    </ul>
  </section>

  <section aria-label="On demand metrics">
    <h3 class="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
      On Demand
    </h3>
    <ul
      aria-label="On demand metric list"
      class="ui-list divide-y divide-border"
      use:dndzone={{ items: demandBars, flipDurationMs: 0, dropTargetStyle: {} }}
      onconsider={(event) => handleConsider("demand", event)}
      onfinalize={(event) => handleFinalize("demand", event)}
    >
      {#each demandBars as bar (bar.id)}
        <li
          data-overview-line={bar.label}
          class="flex items-center gap-2 px-3 py-2.5 text-sm"
        >
          <span
            class="cursor-grab text-muted-foreground transition-colors hover:text-foreground active:cursor-grabbing"
            title="Drag to reorder"
          >
            <GripVertical class="h-4 w-4" />
          </span>
          <span class="flex-1 truncate">{bar.label}</span>
          <Switch
            checked={bar.checked}
            aria-label={`Show ${bar.label} on Overview`}
            onCheckedChange={(checked) => {
              onToggleOverviewProgressBar(plugin.id, bar.label, checked);
            }}
          />
        </li>
      {/each}
      {#if demandBars.length === 0}
        <li class="px-3 py-3 text-sm text-muted-foreground">Empty — drag rows here to stash them.</li>
      {/if}
    </ul>
  </section>

  {#if plugin.windowStarter}
    {@const starter = plugin.windowStarter}
    <section aria-label="Window Starter" class="space-y-3">
      <h3 class="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Window Starter
      </h3>
      <p class="px-1 text-xs text-muted-foreground">
        Optional. Start this provider's idle 5-hour window with one request.
      </p>
      <ul class="ui-list divide-y divide-border">
        {#if starter.windows.length === 1}
          <li class="flex items-center gap-2 px-3 py-2.5 text-sm">
            <span class="flex-1 truncate">Participate</span>
            <Switch
              checked={starter.windows[0].enabled}
              aria-label="Window Starter participation"
              onCheckedChange={(checked) => {
                onWindowStarterParticipation?.(plugin.id, checked);
              }}
            />
          </li>
        {:else}
          {#each starter.windows as window (window.id)}
            <li class="flex items-center gap-2 px-3 py-2.5 text-sm">
              <span class="flex-1 truncate">{window.line}</span>
              <Switch
                checked={window.enabled}
                aria-label={`Start ${window.line} window`}
                onCheckedChange={(checked) => {
                  onWindowStarterWindow?.(plugin.id, window.id, checked);
                }}
              />
            </li>
          {/each}
        {/if}
        <li class="flex items-center gap-2 px-3 py-2.5 text-sm">
          <span class="flex-1 truncate">Runner</span>
          {#if starter.allowedRunners.length > 1}
            <DropdownMenu>
              <DropdownMenuTrigger
                aria-label="Window Starter runner"
                class="ui-pressable h-8 max-w-[11rem] shrink-0 justify-between gap-1.5 rounded-md border border-input bg-background px-2 text-sm font-normal text-foreground"
              >
                <span class="truncate">{runnerLabel(starter.runnerId)}</span>
                <ChevronDown class="size-3.5 shrink-0 text-muted-foreground" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" class="min-w-36">
                {#each starter.allowedRunners as runnerId (runnerId)}
                  <DropdownMenuItem
                    onclick={() => {
                      onWindowStarterRunner?.(plugin.id, runnerId);
                    }}
                  >
                    {#if runnerId === starter.runnerId}
                      <Check />
                    {:else}
                      <span class="size-4 shrink-0" aria-hidden="true"></span>
                    {/if}
                    {runnerLabel(runnerId)}
                  </DropdownMenuItem>
                {/each}
              </DropdownMenuContent>
            </DropdownMenu>
          {:else}
            <span class="text-sm text-muted-foreground">{runnerLabel(starter.runnerId)}</span>
          {/if}
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Copy runner command"
            title="Copy command"
            onclick={copyRunnerCommand}
          >
            {#if copied}
              <Check />
            {:else}
              <Copy />
            {/if}
          </Button>
        </li>
      </ul>
    </section>
  {/if}

  {#if plugin.id === "antigravity"}
    <section aria-label="Credentials" class="space-y-3">
      <h3 class="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Credentials
      </h3>
      <p class="px-1 text-xs text-muted-foreground">
        When quota is stale, run <code class="font-mono">agy -p /quota</code> to refresh the official CLI token. Does not start a 5-hour window.
      </p>
      <ul class="ui-list divide-y divide-border">
        <li class="flex items-center gap-2 px-3 py-2.5 text-sm">
          <span class="flex-1 truncate">Auto-start agy</span>
          <Switch
            checked={plugin.antigravityAgyAutoWake === true}
            aria-label="Auto-start agy"
            onCheckedChange={(checked) => {
              onAntigravityAgyAutoWake?.(checked === true);
            }}
          />
        </li>
      </ul>
    </section>
  {/if}

  {#if plugin.id === "grok"}
    <section aria-label="Credentials" class="space-y-3">
      <h3 class="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        Credentials
      </h3>
      <p class="px-1 text-xs text-muted-foreground">
        When the Grok session expires, run <code class="font-mono">grok models</code> to refresh the Grok Build token. Does not consume quota.
      </p>
      <ul class="ui-list divide-y divide-border">
        <li class="flex items-center gap-2 px-3 py-2.5 text-sm">
          <span class="flex-1 truncate">Auto-start grok</span>
          <Switch
            checked={plugin.grokAutoWake === true}
            aria-label="Auto-start grok"
            onCheckedChange={(checked) => {
              onGrokAutoWake?.(checked === true);
            }}
          />
        </li>
      </ul>
    </section>
  {/if}

</div>
