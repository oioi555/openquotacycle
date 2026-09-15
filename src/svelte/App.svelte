<script lang="ts">
  import AppShell from "./components/app-shell.svelte";
  import AboutDialog from "./components/about-dialog.svelte";
  import { appPluginController } from "./controllers/app-plugin-controller.svelte";
  import { appPreferencesController } from "./controllers/app-preferences-controller.svelte";
  import { appUiController } from "./controllers/app-ui-controller.svelte";
  import { leftoverNotifyController } from "./controllers/leftover-notify-controller.svelte";
  import { pluginViews } from "./controllers/plugin-views.svelte";
  import { probeController } from "./controllers/probe-controller.svelte";
  import { settingsController } from "./controllers/settings-controller.svelte";
  import { trayController } from "./controllers/tray-controller.svelte";
  import { windowStarterRunner } from "./controllers/window-starter-runner.svelte";
  import { credentialWakeController } from "./controllers/credential-wake-controller.svelte";
  import { applyThemeMode, darkModeController } from "./hooks/use-dark-mode.svelte";
  import { crossingGoRemainingMs } from "@/lib/settings";
  import { getAppVersion, isTauri } from "./lib/backend";
  import packageJson from "../../package.json";

  const TRAY_PROBE_DEBOUNCE_MS = 500;

  let appVersion = $state(packageJson.version);
  let booted = $state(false);

  // Bootstrap once: settings, tray handle, window-starter history, dark-mode
  // observation, and the probe-tray bridge.
  $effect(() => {
    if (booted) return;
    booted = true;

    if (isTauri()) {
      getAppVersion()
        .then((version) => (appVersion = version))
        .catch((error) => {
          console.error("Failed to get app version:", error);
        });
    }

    settingsController.setTrayIconScheduler((reason, delayMs) =>
      trayController.scheduleUpdate(reason, delayMs),
    );
    probeController.onProbeResult = (pluginId) => {
      credentialWakeController.onProbeResult(
        probeController.pluginStates[pluginId],
        pluginId,
      );
      windowStarterRunner.checkConfirmations();
      trayController.scheduleUpdate("probe", TRAY_PROBE_DEBOUNCE_MS);
    };

    void settingsController.bootstrap();
    void trayController.init();
    void windowStarterRunner.init();
    void credentialWakeController.init();
    darkModeController.observe();
  });

  // Apply the theme preference to the document root.
  $effect(() => {
    return applyThemeMode(appPreferencesController.themeMode);
  });

  // Keep the probe auto-update schedule in sync with settings.
  $effect(() => {
    probeController.syncAutoUpdate(
      appPluginController.pluginSettings,
      appPreferencesController.autoUpdateInterval,
    );
  });

  // Tray inputs; schedule an initial render once settings/meta are available.
  $effect(() => {
    trayController.syncInputs({
      pluginsMeta: appPluginController.pluginsMeta,
      pluginSettings: appPluginController.pluginSettings,
      pluginStates: probeController.pluginStates,
      displayMode: appPreferencesController.displayMode,
    });
    if (trayController.trayReady && appPluginController.pluginSettings && appPluginController.pluginsMeta.length > 0) {
      trayController.scheduleUpdate("init", 0);
    }
  });

  // Tray refresh on settings changes.
  $effect(() => {
    void appPreferencesController.displayMode;
    if (trayController.trayReady) {
      trayController.scheduleUpdate("settings", 0);
    }
  });

  $effect(() => {
    credentialWakeController.syncInputs({
      autoWake: appPluginController.pluginSettings?.antigravityAgyAutoWake === true,
      agyAvailable: credentialWakeController.availableById.antigravity === true,
      grokAutoWake: appPluginController.pluginSettings?.grokAutoWake === true,
      grokAvailable: credentialWakeController.availableById.grok === true,
    });
  });

  // Window Starter: snapshot inputs only. checkConfirmations runs on probe
  // results (see bootstrap) and auto-run is triggered untracked inside the
  // runner — calling either here would read $state this effect writes, which
  // re-triggers the effect forever (effect_update_depth_exceeded).
  $effect(() => {
    windowStarterRunner.syncInputs({
      enabled: appPreferencesController.windowStarterEnabled,
      pluginSettings: appPluginController.pluginSettings,
      pluginMetas: appPluginController.pluginsMeta,
      pluginStates: probeController.pluginStates,
    });
  });

  $effect(() => {
    leftoverNotifyController.syncInputs({
      plugins: pluginViews.displayPlugins,
      remainingBandMs: crossingGoRemainingMs(appPreferencesController.crossingGoRemainingMinutes),
      notifyEnabled: appPreferencesController.leftoverNotifyEnabled,
    });
  });
</script>

<AppShell
  onRefreshAll={() => probeController.handleRefreshAll()}
  autoUpdateNextAt={probeController.autoUpdateNextAt}
  appVersion={appVersion}
>
  {#snippet about()}
    {#if appUiController.showAbout}
      <AboutDialog
        version={appVersion}
        onClose={() => appUiController.setShowAbout(false)}
      />
    {/if}
  {/snippet}
</AppShell>
