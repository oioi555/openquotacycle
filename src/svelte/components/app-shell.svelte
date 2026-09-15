<script lang="ts">
  import type { Snippet } from "svelte";
  import TopBar from "./top-bar.svelte";
  import ResetCustomizationDialog from "./reset-customization-dialog.svelte";
  import AppContent from "./app-content.svelte";
  import PanelFooter from "./panel-footer.svelte";
  import {
    appUiController,
    CUSTOMIZE_TIMELINE_SCREEN,
    customizePluginId,
    isCustomizeTimeline,
    isRootScreen,
    trayPayloadToScreen,
  } from "../controllers/app-ui-controller.svelte";
  import {
    panelController,
    resolveShellKeyAction,
    backScreen,
    advanceScreen,
  } from "../controllers/panel-controller.svelte";
  import { pluginViews } from "../controllers/plugin-views.svelte";
  import { settingsController } from "../controllers/settings-controller.svelte";

  let {
    onRefreshAll,
    autoUpdateNextAt,
    appVersion,
    about,
  }: {
    onRefreshAll?: () => void;
    autoUpdateNextAt: number | null;
    appVersion: string;
    /** About dialog overlay, rendered over the panel when open. */
    about: Snippet;
  } = $props();

  let scrollEl: HTMLElement | undefined = $state();

  const screen = $derived(appUiController.screen);
  // Top-right: reset on Customize / Settings / provider detail; sliders on
  // Timeline; refresh elsewhere. Auto-refresh countdown rides Refresh.
  const customizeId = $derived(customizePluginId(screen));
  const isTimelineCustomize = $derived(isCustomizeTimeline(screen));
  const resetsDisplay = $derived(Boolean(customizeId) || isTimelineCustomize);
  const showRefreshCountdown = $derived(
    !resetsDisplay && screen !== "customize" && screen !== "settings" && screen !== "timeline",
  );

  // Tray-driven navigation + scroll fade indicator.
  $effect(() => {
    void panelController.attachTrayEvents({
      onNavigate: (payload) => appUiController.setScreen(trayPayloadToScreen(payload)),
      onShowAbout: () => appUiController.setShowAbout(true),
    });
    return () => panelController.dispose();
  });

  function handleShellKeydown(event: KeyboardEvent): void {
    const action = resolveShellKeyAction(event, appUiController.showAbout);
    if (!action) return;
    event.preventDefault();
    if (action === "back") {
      const next = backScreen(screen);
      if (next !== screen) appUiController.setScreen(next);
    } else if (action === "advance") {
      const next = advanceScreen(screen);
      if (next !== screen) appUiController.setScreen(next);
    } else if (action === "toggle-settings") {
      appUiController.toggleSettings();
    } else {
      onRefreshAll?.();
    }
  }

  function checkScroll(): void {
    panelController.updateScrollState(scrollEl ?? null);
  }

  $effect(() => {
    checkScroll();
    const el = scrollEl;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    const ro = new ResizeObserver(checkScroll);
    ro.observe(el);
    const mo = new MutationObserver(checkScroll);
    mo.observe(el, { childList: true, subtree: true });
    return () => {
      el.removeEventListener("scroll", checkScroll);
      ro.disconnect();
      mo.disconnect();
    };
  });
</script>

<svelte:window onkeydown={handleShellKeydown} />

<div tabindex="-1" class="flex h-screen flex-col bg-tray outline-none">
  <div class="relative flex min-h-0 flex-1 flex-col overflow-hidden border bg-tray shadow-sm">
    <TopBar
      title={pluginViews.screenTitle}
      onBack={isRootScreen(screen) ? undefined : () => appUiController.setScreen(backScreen(screen))}
      onRefresh={customizeId
        ? () => settingsController.handleOverviewDisplayReset(customizeId)
        : isTimelineCustomize
          ? () => settingsController.handleTimelineCardRowsReset()
          : screen === "customize"
            ? () => appUiController.setShowResetAllCustomization(true)
            : screen === "settings"
              ? () => settingsController.handleResetSettingsDefaults()
              : screen === "timeline"
                ? () => appUiController.setScreen(CUSTOMIZE_TIMELINE_SCREEN)
                : onRefreshAll}
      refreshTitle={resetsDisplay
        ? "Reset display settings"
        : screen === "customize"
          ? "Reset all customization"
          : screen === "settings"
            ? "Reset settings"
            : screen === "timeline"
              ? "Customize"
              : "Refresh"}
      refreshIcon={resetsDisplay || screen === "customize" || screen === "settings"
        ? "reset"
        : screen === "timeline"
          ? "sliders"
          : "refresh"}
      autoUpdateNextAt={showRefreshCountdown ? autoUpdateNextAt : undefined}
    />
    <div class="flex min-h-0 min-w-0 flex-1 flex-col bg-tray px-3.5 pt-3.5">
      <div class="relative min-h-0 flex-1">
        <div bind:this={scrollEl} class="h-full overflow-y-auto scrollbar-none pb-3">
          <AppContent {appVersion} />
        </div>
        <div
          class="pointer-events-none absolute inset-x-0 bottom-0 h-14 bg-linear-to-t from-tray to-transparent transition-opacity duration-200 {panelController.canScrollDown
            ? 'opacity-100'
            : 'opacity-0'}"
        ></div>
      </div>
    </div>
    <PanelFooter />
    {#if appUiController.showAbout}
      {@render about()}
    {/if}
    {#if appUiController.showResetAllCustomization}
      <ResetCustomizationDialog
        onCancel={() => appUiController.setShowResetAllCustomization(false)}
        onConfirm={() => {
          appUiController.setShowResetAllCustomization(false);
          settingsController.handleResetAllCustomization();
        }}
      />
    {/if}
  </div>
</div>
