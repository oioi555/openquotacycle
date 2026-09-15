<script lang="ts">
  import ProviderCard from "../components/provider-card.svelte";
  import ProviderContextMenu from "../components/provider-context-menu.svelte";
  import TimelineCard from "../components/timeline-card.svelte";
  import { effectiveHiddenOverviewLabels } from "@/lib/settings";
  import { appPluginController } from "../controllers/app-plugin-controller.svelte";
  import { appUiController } from "../controllers/app-ui-controller.svelte";
  import { probeController } from "../controllers/probe-controller.svelte";
  import { settingsController } from "../controllers/settings-controller.svelte";
  import {
    REFRESH_COOLDOWN_MS,
    type CrossingGoRemainingMinutes,
    type DisplayMode,
    type HiddenOverviewProgressLines,
    type ResetTimerDisplayMode,
    type TimelineCardRowId,
    DEFAULT_CROSSING_GO_REMAINING_MINUTES,
    crossingGoRemainingMs,
  } from "@/lib/settings";
  import type { DisplayPluginState } from "../controllers/plugin-views.svelte";
  import { shouldShowWakeAction, credentialWakeProviders } from "@/lib/antigravity-wake";

  let {
    plugins,
    visibleProgressLinesByPlugin = {},
    lineOrderByPlugin = {},
    onRetryPlugin,
    onStartAgy,
    agyAvailable = false,
    grokAvailable = false,
    agyWaking = false,
    grokWaking = false,
    displayMode,
    resetTimerDisplayMode,
    onResetTimerDisplayModeToggle,
    onDisplayModeToggle,
    timelineCardVisible = true,
    timelineCardRows,
    onHideTimelineCard,
    now,
    crossingGoRemainingMinutes = DEFAULT_CROSSING_GO_REMAINING_MINUTES,
  }: {
    plugins: DisplayPluginState[];
    visibleProgressLinesByPlugin?: HiddenOverviewProgressLines;
    lineOrderByPlugin?: HiddenOverviewProgressLines;
    onRetryPlugin?: (pluginId: string) => void;
    onStartAgy?: (pluginId: string) => void;
    agyAvailable?: boolean;
    grokAvailable?: boolean;
    agyWaking?: boolean;
    grokWaking?: boolean;
    displayMode: DisplayMode;
    resetTimerDisplayMode: ResetTimerDisplayMode;
    onResetTimerDisplayModeToggle?: () => void;
    onDisplayModeToggle?: () => void;
    timelineCardVisible?: boolean;
    timelineCardRows?: TimelineCardRowId[];
    onHideTimelineCard?: () => void;
    now?: number;
    crossingGoRemainingMinutes?: CrossingGoRemainingMinutes;
  } = $props();

  const remainingBandMs = $derived(crossingGoRemainingMs(crossingGoRemainingMinutes));

  function isPluginRefreshAvailable(pluginId: string): boolean {
    const pluginState = probeController.pluginStates[pluginId];
    if (!pluginState) return true;
    if (pluginState.loading || pluginState.refreshing) return false;
    if (!pluginState.lastManualRefreshAt) return true;
    return Date.now() - pluginState.lastManualRefreshAt >= REFRESH_COOLDOWN_MS;
  }

  function handleHeaderContextMenu(event: MouseEvent, pluginId: string): void {
    event.preventDefault();
    contextMenu = {
      x: event.clientX,
      y: event.clientY,
      pluginId,
      refreshEnabled: isPluginRefreshAvailable(pluginId),
    };
  }

  function handleContextMenuAction(pluginId: string, action: "reload" | "remove" | "customize"): void {
    if (action === "customize") {
      appUiController.setScreen(`customize:${pluginId}`);
      return;
    }
    if (action === "reload") {
      probeController.handleRetryPlugin(pluginId);
      return;
    }
    const currentSettings = appPluginController.pluginSettings;
    if (!currentSettings || currentSettings.disabled.includes(pluginId)) return;
    settingsController.handleToggle(pluginId);
  }

  let contextMenu: {
    x: number;
    y: number;
    pluginId: string;
    refreshEnabled: boolean;
  } | null = $state(null);
</script>

{#if plugins.length === 0}
  <div class="text-center text-muted-foreground py-8">No providers enabled</div>
{:else}
  <div class="space-y-3.5">
    {#if timelineCardVisible}
      <TimelineCard
        {plugins}
        {now}
        {resetTimerDisplayMode}
        visibleRows={timelineCardRows}
        onHide={onHideTimelineCard}
        crossingGoRemainingMs={remainingBandMs}
      />
    {/if}

    {#each plugins as plugin (plugin.meta.id)}
      <ProviderCard
        name={plugin.meta.name}
        plan={plugin.data?.plan}
        iconUrl={plugin.meta.iconUrl}
        brandColor={plugin.meta.brandColor}
        links={plugin.meta.links}
        loading={plugin.loading}
        refreshing={plugin.refreshing}
        error={plugin.error}
        staleError={plugin.staleError}
        statuses={plugin.data?.statuses ?? []}
        lines={plugin.data?.lines ?? []}
        skeletonLines={plugin.meta.lines}
        lastManualRefreshAt={plugin.lastManualRefreshAt}
        lastUpdatedAt={plugin.lastUpdatedAt}
        onRetry={onRetryPlugin ? () => onRetryPlugin(plugin.meta.id) : undefined}
        showStartAgy={shouldShowWakeAction({
          pluginId: plugin.meta.id,
          available: plugin.meta.id === "grok" ? grokAvailable : agyAvailable,
          error: plugin.error,
          staleError: plugin.staleError,
          data: plugin.data,
        })}
        startAgyBusy={plugin.meta.id === "grok" ? grokWaking : agyWaking}
        wakeAriaLabel={credentialWakeProviders[plugin.meta.id]?.ariaLabel ?? "Start agy"}
        wakeTooltip={credentialWakeProviders[plugin.meta.id]?.tooltip ?? "Start agy to refresh the session"}
        wakeNotice={credentialWakeProviders[plugin.meta.id]?.fallbackNotice}
        onStartAgy={onStartAgy ? () => onStartAgy(plugin.meta.id) : undefined}
        scopeFilter="all"
        hiddenProgressLabels={effectiveHiddenOverviewLabels(
          plugin.meta,
          visibleProgressLinesByPlugin[plugin.meta.id],
        )}
        lineLabelsOrder={lineOrderByPlugin[plugin.meta.id] ?? []}
        {displayMode}
        {resetTimerDisplayMode}
        {onResetTimerDisplayModeToggle}
        {onDisplayModeToggle}
        crossingGoRemainingMs={remainingBandMs}
        expandable
        expanded={appUiController.expandedPluginIds.has(plugin.meta.id)}
        onToggleExpand={() => appUiController.togglePluginExpanded(plugin.meta.id)}
        onHeaderContextMenu={(event) => handleHeaderContextMenu(event, plugin.meta.id)}
        {now}
      />
    {/each}
  </div>
  {#if contextMenu}
    {@const menu = contextMenu}
    <ProviderContextMenu
      x={menu.x}
      y={menu.y}
      refreshEnabled={menu.refreshEnabled}
      onAction={(action) => handleContextMenuAction(menu.pluginId, action)}
      onClose={() => (contextMenu = null)}
    />
  {/if}
{/if}
