<script lang="ts">
  import CheckCircle2 from "@lucide/svelte/icons/check-circle-2";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import CircleAlert from "@lucide/svelte/icons/circle-alert";
  import Clock3 from "@lucide/svelte/icons/clock-3";
  import XCircle from "@lucide/svelte/icons/x-circle";
  import Badge from "../components/ui/badge.svelte";
  import Switch from "../components/ui/switch.svelte";
  import WindowStarterContextMenu from "../components/window-starter-context-menu.svelte";
  import WindowStarterRunDialog from "../components/window-starter-run-dialog.svelte";
  import { darkModeController } from "../hooks/use-dark-mode.svelte";
  import { getIconColor } from "@/lib/color";
  import type { WindowStarterAttempt } from "@/lib/window-starter";
  import {
    attemptsForStarterCard,
    formatWindowStarterClock,
    groupWindowStarterCards,
    latestAttemptForStarterWindow,
    starterLogTitle,
    WINDOW_STARTER_RUNNER_LABELS,
    windowStarterRowKey,
    type WindowStarterProviderStatus,
    type WindowStarterProviderView,
  } from "@/lib/window-starter-state";
  import { cn } from "@/lib/utils";

  let {
    enabled,
    historyReady,
    providers,
    attempts,
    onEnabledChange,
    onWindowParticipation,
    onCustomize,
    onManualRun,
  }: {
    enabled: boolean;
    historyReady: boolean;
    providers: WindowStarterProviderView[];
    attempts: WindowStarterAttempt[];
    onEnabledChange: (enabled: boolean) => void;
    onWindowParticipation?: (pluginId: string, windowId: string, enabled: boolean) => void;
    onCustomize?: (pluginId: string) => void;
    onManualRun?: (provider: WindowStarterProviderView) => void;
  } = $props();

  let expandedPluginIds = $state<ReadonlySet<string>>(new Set());
  let contextMenu: {
    x: number;
    y: number;
    provider: WindowStarterProviderView;
  } | null = $state(null);
  let pendingRun: WindowStarterProviderView | null = $state(null);

  const busy = $derived(providers.some((provider) => provider.status === "running"));
  const cards = $derived(groupWindowStarterCards(providers));
  const isDark = $derived(darkModeController.isDark);

  const STATUS_LABELS: Record<WindowStarterProviderStatus, string> = {
    disabled: "Plugin disabled",
    off: "Off",
    loading: "Checking quota",
    unknown: "Waiting for data",
    active: "Active",
    ready: "Ready",
    locked: "Attempted",
    "weekly-exhausted": "Weekly exhausted",
    "cli-missing": "CLI missing",
    running: "Starting",
  };

  function runnerLabel(runnerId: string | undefined): string | null {
    if (!runnerId) return null;
    return WINDOW_STARTER_RUNNER_LABELS[runnerId] ?? runnerId;
  }

  function statusClass(status: WindowStarterProviderStatus): string {
    if (status === "active" || status === "ready") return "text-green-500 border-green-500/30";
    if (status === "running" || status === "loading") return "text-yellow-500 border-yellow-500/30";
    if (status === "weekly-exhausted" || status === "cli-missing") {
      return "text-red-500 border-red-500/30";
    }
    return "text-muted-foreground";
  }

  function isExpanded(pluginId: string): boolean {
    return expandedPluginIds.has(pluginId);
  }

  function toggleExpanded(pluginId: string): void {
    const next = new Set(expandedPluginIds);
    if (next.has(pluginId)) next.delete(pluginId);
    else next.add(pluginId);
    expandedPluginIds = next;
  }

  function handleCardClick(event: MouseEvent, pluginId: string): void {
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, [role='button'], [role='switch'], details, summary")) return;
    toggleExpanded(pluginId);
  }

  function handleRowContextMenu(event: MouseEvent, provider: WindowStarterProviderView): void {
    event.preventDefault();
    contextMenu = { x: event.clientX, y: event.clientY, provider };
  }

  function handleMenuAction(
    provider: WindowStarterProviderView,
    action: "toggle" | "customize" | "run",
  ): void {
    if (action === "toggle") {
      onWindowParticipation?.(provider.pluginId, provider.windowId, !provider.participationEnabled);
      return;
    }
    if (action === "customize") {
      onCustomize?.(provider.pluginId);
      return;
    }
    pendingRun = provider;
  }
</script>

{#snippet providerIcon(name: string, iconUrl: string | undefined, brandColor: string | undefined)}
  {#if iconUrl}
    <span
      role="img"
      aria-label={name}
      class="size-4 inline-block shrink-0"
      style:background-color={getIconColor(brandColor, isDark)}
      style:-webkit-mask-image={`url(${iconUrl})`}
      style:-webkit-mask-size="contain"
      style:-webkit-mask-repeat="no-repeat"
      style:-webkit-mask-position="center"
      style:mask-image={`url(${iconUrl})`}
      style:mask-size="contain"
      style:mask-repeat="no-repeat"
      style:mask-position="center"
    ></span>
  {:else}
    <span class="text-xs font-semibold">{name.slice(0, 1)}</span>
  {/if}
{/snippet}

{#snippet attemptIcon(status: WindowStarterAttempt["status"])}
  <span class="shrink-0" aria-label={status}>
    {#if status === "confirmed"}
      <CheckCircle2 class="size-3.5 text-green-500" aria-hidden="true" />
    {:else if status === "failed" || status === "interrupted"}
      <XCircle class="size-3.5 text-red-500" aria-hidden="true" />
    {:else if status === "unconfirmed"}
      <CircleAlert class="size-3.5 text-yellow-500" aria-hidden="true" />
    {:else}
      <Clock3 class="size-3.5 text-yellow-500" aria-hidden="true" />
    {/if}
  </span>
{/snippet}

{#snippet attemptRow(attempt: WindowStarterAttempt, showWindow: boolean)}
  {@const runner = runnerLabel(attempt.runnerId)}
  {@const title = starterLogTitle(attempt, showWindow)}
  <details class="group border-t border-border/60">
    <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2 text-sm hover:bg-muted/40">
      {@render attemptIcon(attempt.status)}
      <span class="min-w-0 flex-1 truncate font-medium">{title}</span>
      <time class="shrink-0 text-xs tabular-nums text-muted-foreground">{formatWindowStarterClock(attempt.startedAt)}</time>
      <ChevronDown class="size-3 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
    </summary>
    <div class="space-y-1.5 bg-muted/25 px-3 py-2.5 text-xs">
      {#if attempt.windowLine}
        <div><span class="text-muted-foreground">Window:</span> {attempt.windowLine}</div>
      {/if}
      {#if runner}
        <div><span class="text-muted-foreground">Runner:</span> {runner}</div>
      {/if}
      {#if attempt.resetsAt}
        <div><span class="text-muted-foreground">Reset:</span> {formatWindowStarterClock(attempt.resetsAt)}</div>
      {/if}
      {#if attempt.command}
        <div class="break-all"><span class="text-muted-foreground">Command:</span> {attempt.command}</div>
      {/if}
      {#if attempt.prompt}
        <div><span class="text-muted-foreground">Prompt:</span> {attempt.prompt}</div>
      {/if}
      {#if attempt.durationMs !== undefined}
        <div><span class="text-muted-foreground">Duration:</span> {(attempt.durationMs / 1000).toFixed(1)}s</div>
      {/if}
      {#if attempt.error}
        <div class="break-words text-red-500">{attempt.error}</div>
      {/if}
    </div>
  </details>
{/snippet}

<section class="space-y-3" aria-label="Window Starter">
  <div class="px-1 pt-1">
    <h2 class="truncate text-sm font-semibold">Window Starter</h2>
  </div>

  <div class="ui-card flex items-center justify-between gap-3 px-3.5 py-2.5">
    <div class="min-w-0">
      <div class="text-sm font-medium">Auto-start</div>
      <p class="text-xs text-muted-foreground">Starts idle 5-hour windows.</p>
    </div>
    <Switch
      checked={enabled}
      aria-label="Auto-start"
      onCheckedChange={onEnabledChange}
    />
  </div>

  {#each cards as card (card.pluginId)}
    {@const expanded = isExpanded(card.pluginId)}
    {@const logs = attemptsForStarterCard(attempts, card.pluginId)}
    {@const multi = card.windows.length > 1}
    <div role="group" aria-label={card.name}>
      <div class="px-1 pt-1">
        <div class="mb-1 flex items-center justify-between gap-2">
          <h3 class="truncate text-sm font-semibold">{card.name}</h3>
          {@render providerIcon(card.name, card.iconUrl, card.brandColor)}
        </div>
      </div>
      <!-- svelte-ignore a11y_click_events_have_key_events -->
      <!-- svelte-ignore a11y_no_static_element_interactions -->
      <div
        class="ui-card ui-pressable cursor-pointer overflow-hidden transition-colors hover:bg-card-hover"
        onclick={(event) => handleCardClick(event, card.pluginId)}
      >
        {#each card.windows as provider (windowStarterRowKey(provider.pluginId, provider.windowLine))}
          {@const latest = latestAttemptForStarterWindow(attempts, provider.pluginId, provider.windowLine)}
          <div
            role="listitem"
            aria-label={`${provider.name} · ${provider.windowLine}`}
            class="flex cursor-context-menu items-center gap-2 border-b border-border/60 px-3.5 py-2 last:border-b-0"
            oncontextmenu={(event) => handleRowContextMenu(event, provider)}
          >
            <span class="shrink-0 truncate text-sm">{provider.windowLine}</span>
            {#if latest}
              <span class="flex min-w-0 flex-1 items-center gap-1.5">
                {@render attemptIcon(latest.status)}
                <time class="truncate text-xs tabular-nums text-muted-foreground">
                  {formatWindowStarterClock(latest.startedAt)}
                </time>
              </span>
            {:else}
              <span class="min-w-0 flex-1"></span>
            {/if}
            <Badge variant="outline" class={cn("shrink-0", statusClass(provider.status))}>
              {STATUS_LABELS[provider.status]}
            </Badge>
          </div>
        {/each}
        <div class="flex w-full items-center justify-center py-1">
          <button
            type="button"
            aria-expanded={expanded}
            aria-label={expanded ? `Collapse ${card.name}` : `Expand ${card.name}`}
            onclick={() => toggleExpanded(card.pluginId)}
            class="flex cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground"
          >
            <ChevronDown class={cn("size-2.5 transition-transform", expanded && "-rotate-180")} />
          </button>
        </div>
        {#if expanded}
          {#if !historyReady}
            <div class="border-t border-border/60 px-3 py-3 text-center text-xs text-muted-foreground">
              Loading activity...
            </div>
          {:else if logs.length === 0}
            <div class="border-t border-border/60 px-3 py-3 text-center text-xs text-muted-foreground">
              No window starts yet
            </div>
          {:else}
            {#each logs as attempt (attempt.id)}
              {@render attemptRow(attempt, multi)}
            {/each}
          {/if}
        {/if}
      </div>
    </div>
  {/each}
</section>

{#if contextMenu}
  {@const menu = contextMenu}
  <WindowStarterContextMenu
    x={menu.x}
    y={menu.y}
    participationEnabled={menu.provider.participationEnabled}
    customizeEnabled={menu.provider.status !== "disabled"}
    runEnabled={menu.provider.cliAvailable === true && !busy}
    onAction={(action) => handleMenuAction(menu.provider, action)}
    onClose={() => (contextMenu = null)}
  />
{/if}

{#if pendingRun}
  {@const runner = runnerLabel(pendingRun.runnerId) ?? pendingRun.runnerId}
  <WindowStarterRunDialog
    title="Run Window Starter?"
    description={`This sends one starter request for ${pendingRun.name} · ${pendingRun.windowLine} with ${runner}.`}
    onCancel={() => (pendingRun = null)}
    onConfirm={() => {
      const view = pendingRun;
      pendingRun = null;
      if (view) onManualRun?.(view);
    }}
  />
{/if}
