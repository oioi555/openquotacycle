<script lang="ts">
  import { fly } from "svelte/transition";
  import OverviewPage from "../pages/overview.svelte";
  import TimelinePage from "../pages/timeline.svelte";
  import CustomizePage from "../pages/customize.svelte";
  import CustomizeProviderPage from "../pages/customize-provider.svelte";
  import CustomizeTimelinePage from "../pages/customize-timeline.svelte";
  import SettingsPage from "../pages/settings.svelte";
  import {
    appUiController,
    customizePluginId,
    isCustomizeTimeline,
  } from "../controllers/app-ui-controller.svelte";
  import { appPluginController } from "../controllers/app-plugin-controller.svelte";
  import { appPreferencesController } from "../controllers/app-preferences-controller.svelte";
  import { pluginViews } from "../controllers/plugin-views.svelte";
  import { probeController } from "../controllers/probe-controller.svelte";
  import { settingsController } from "../controllers/settings-controller.svelte";
  import { windowStarterController } from "../controllers/window-starter-controller.svelte";
  import { windowStarterRunner } from "../controllers/window-starter-runner.svelte";
  import { credentialWakeController } from "../controllers/credential-wake-controller.svelte";
  import { prefersReducedMotion } from "../lib/motion";

  let { appVersion }: { appVersion: string } = $props();

  const screen = $derived(appUiController.screen);
  const direction = $derived(appUiController.lastDirection);
  const slideDuration = $derived(prefersReducedMotion() ? 0 : 180);

  const visibleProgressLinesByPlugin = $derived(
    appPluginController.pluginSettings?.visibleOverviewProgressLines ?? {},
  );
  const lineOrderByPlugin = $derived(
    appPluginController.pluginSettings?.overviewLineOrder ?? {},
  );
  const customizeId = $derived(customizePluginId(screen));
  const customizeConfig = $derived(
    customizeId
      ? (pluginViews.settingsPlugins.find((plugin) => plugin.id === customizeId) ?? null)
      : null,
  );
</script>

{#key screen}
  <!-- No fixed height here: the page must grow with its content so the shell's
       scroll container can scroll and the footer stays visible. -->
  <div in:fly={{ x: 32 * direction, duration: slideDuration }}>
    {#if screen === "dashboard"}
      <OverviewPage
        plugins={pluginViews.displayPlugins}
        {visibleProgressLinesByPlugin}
        {lineOrderByPlugin}
        onRetryPlugin={(id) => probeController.handleRetryPlugin(id)}
        onStartAgy={(pluginId) => void credentialWakeController.wakeAndReprobe(pluginId)}
        agyAvailable={credentialWakeController.availableById.antigravity === true}
        grokAvailable={credentialWakeController.availableById.grok === true}
        agyWaking={credentialWakeController.waking}
        grokWaking={credentialWakeController.isWaking("grok")}
        displayMode={appPreferencesController.displayMode}
        resetTimerDisplayMode={appPreferencesController.resetTimerDisplayMode}
        onResetTimerDisplayModeToggle={() => settingsController.handleResetTimerDisplayModeToggle()}
        onDisplayModeToggle={() => settingsController.handleDisplayModeToggle()}
        crossingGoRemainingMinutes={appPreferencesController.crossingGoRemainingMinutes}
        timelineCardVisible={appPreferencesController.timelineCardVisible}
        timelineCardRows={appPreferencesController.timelineCardRows}
        onHideTimelineCard={() => settingsController.handleTimelineCardVisibleChange(false)}
      />
    {:else if screen === "timeline"}
      <TimelinePage
        plugins={pluginViews.displayPlugins}
        starterEnabled={appPreferencesController.windowStarterEnabled}
        starterHistoryReady={windowStarterRunner.historyReady}
        starterProviders={windowStarterRunner.providerViews}
        starterAttempts={windowStarterController.attempts}
        onStarterEnabledChange={(value) => settingsController.handleWindowStarterEnabledChange(value)}
        onStarterWindowParticipation={(pluginId, windowId, enabled) => {
          const starter = pluginViews.settingsPlugins.find((plugin) => plugin.id === pluginId)
            ?.windowStarter;
          if (starter && starter.windows.length > 1) {
            settingsController.handleWindowStarterWindow(pluginId, windowId, enabled);
            return;
          }
          settingsController.handleWindowStarterParticipation(pluginId, enabled);
        }}
        onStarterCustomize={(pluginId) => appUiController.setScreen(`customize:${pluginId}`)}
        onStarterManualRun={(view) => void windowStarterRunner.runWindow(view)}
      />
    {:else if screen === "customize"}
      <CustomizePage
        plugins={pluginViews.settingsPlugins}
        onReorder={(ids) => settingsController.handleReorder(ids)}
        onToggle={(id) => settingsController.handleToggle(id)}
        onOpenDetail={(id) => appUiController.setScreen(`customize:${id}`)}
        timelineCardVisible={appPreferencesController.timelineCardVisible}
        onTimelineCardVisibleChange={(value) =>
          settingsController.handleTimelineCardVisibleChange(value)}
      />
    {:else if isCustomizeTimeline(screen)}
      <CustomizeTimelinePage
        visibleRows={appPreferencesController.timelineCardRows}
        onToggle={(kind, visible) => settingsController.handleTimelineCardRowToggle(kind, visible)}
      />
    {:else if customizeConfig && customizeId}
      <CustomizeProviderPage
        plugin={customizeConfig}
        onToggleOverviewProgressBar={(pluginId, label, visible) =>
          settingsController.handleOverviewProgressBarToggle(pluginId, label, visible)}
        onOverviewLineReorder={(pluginId, orderedLabels) =>
          settingsController.handleOverviewLineReorder(pluginId, orderedLabels)}
        onWindowStarterParticipation={(pluginId, enabled) =>
          settingsController.handleWindowStarterParticipation(pluginId, enabled)}
        onWindowStarterWindow={(pluginId, windowId, enabled) =>
          settingsController.handleWindowStarterWindow(pluginId, windowId, enabled)}
        onWindowStarterRunner={(pluginId, runnerId) =>
          settingsController.handleWindowStarterRunner(pluginId, runnerId)}
        onAntigravityAgyAutoWake={(enabled) => settingsController.handleAntigravityAgyAutoWake(enabled)}
        onGrokAutoWake={(enabled) => settingsController.handleGrokAutoWake(enabled)}
      />
    {:else if screen === "settings"}
      <SettingsPage
        version={appVersion}
        autoUpdateInterval={appPreferencesController.autoUpdateInterval}
        onAutoUpdateIntervalChange={(value) => settingsController.handleAutoUpdateIntervalChange(value)}
        themeMode={appPreferencesController.themeMode}
        onThemeModeChange={(mode) => settingsController.handleThemeModeChange(mode)}
        displayMode={appPreferencesController.displayMode}
        onDisplayModeChange={(mode) => settingsController.handleDisplayModeChange(mode)}
        resetTimerDisplayMode={appPreferencesController.resetTimerDisplayMode}
        onResetTimerDisplayModeChange={(mode) => settingsController.handleResetTimerDisplayModeChange(mode)}
        crossingGoRemainingMinutes={appPreferencesController.crossingGoRemainingMinutes}
        onCrossingGoRemainingMinutesChange={(minutes) =>
          settingsController.handleCrossingGoRemainingMinutesChange(minutes)}
        leftoverNotifyEnabled={appPreferencesController.leftoverNotifyEnabled}
        onLeftoverNotifyEnabledChange={(value) =>
          settingsController.handleLeftoverNotifyEnabledChange(value)}
        globalShortcut={appPreferencesController.globalShortcut}
        onGlobalShortcutChange={(value) => settingsController.handleGlobalShortcutChange(value)}
        startOnLogin={appPreferencesController.startOnLogin}
        onStartOnLoginChange={(value) => settingsController.handleStartOnLoginChange(value)}
      />
    {/if}
  </div>
{/key}
