<script lang="ts">
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Info from "@lucide/svelte/icons/info";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import GlobalShortcutSection from "../components/global-shortcut-section.svelte";
  import SettingsSelect from "../components/settings-select.svelte";
  import Switch from "../components/ui/switch.svelte";
  import {
    AUTO_UPDATE_OPTIONS,
    CROSSING_GO_REMAINING_OPTIONS,
    DISPLAY_MODE_OPTIONS,
    RESET_TIMER_DISPLAY_OPTIONS,
    THEME_OPTIONS,
    type AutoUpdateIntervalMinutes,
    type CrossingGoRemainingMinutes,
    type DisplayMode,
    type GlobalShortcut,
    type ResetTimerDisplayMode,
    type ThemeMode,
  } from "@/lib/settings";
  import { appUiController } from "../controllers/app-ui-controller.svelte";

  let {
    version,
    autoUpdateInterval,
    onAutoUpdateIntervalChange,
    themeMode,
    onThemeModeChange,
    displayMode,
    onDisplayModeChange,
    resetTimerDisplayMode,
    onResetTimerDisplayModeChange,
    crossingGoRemainingMinutes,
    onCrossingGoRemainingMinutesChange,
    leftoverNotifyEnabled,
    onLeftoverNotifyEnabledChange,
    globalShortcut,
    onGlobalShortcutChange,
    startOnLogin,
    onStartOnLoginChange,
  }: {
    version: string;
    autoUpdateInterval: AutoUpdateIntervalMinutes;
    onAutoUpdateIntervalChange: (value: AutoUpdateIntervalMinutes) => void;
    themeMode: ThemeMode;
    onThemeModeChange: (value: ThemeMode) => void;
    displayMode: DisplayMode;
    onDisplayModeChange: (value: DisplayMode) => void;
    resetTimerDisplayMode: ResetTimerDisplayMode;
    onResetTimerDisplayModeChange: (value: ResetTimerDisplayMode) => void;
    crossingGoRemainingMinutes: CrossingGoRemainingMinutes;
    onCrossingGoRemainingMinutesChange: (value: CrossingGoRemainingMinutes) => void;
    leftoverNotifyEnabled: boolean;
    onLeftoverNotifyEnabledChange: (value: boolean) => void;
    globalShortcut: GlobalShortcut;
    onGlobalShortcutChange: (value: GlobalShortcut) => void;
    startOnLogin: boolean;
    onStartOnLoginChange: (value: boolean) => void;
  } = $props();
</script>

{#snippet groupTitle(title: string)}
  <h3 class="mb-1.5 px-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
    {title}
  </h3>
{/snippet}

<div class="space-y-4 py-3">
  <section>
    {@render groupTitle("General")}
    <ul class="ui-list divide-y divide-border">
      <li class="flex items-center gap-2 px-3 py-2.5">
        <span class="min-w-0 flex-1 truncate text-sm">Start on Login</span>
        <Switch
          checked={startOnLogin}
          aria-label="Start on login"
          onCheckedChange={(checked) => onStartOnLoginChange(checked)}
        />
      </li>
      <GlobalShortcutSection {globalShortcut} {onGlobalShortcutChange} />
      <li class="flex items-center gap-2 px-3 py-2.5">
        <span class="min-w-0 flex-1 truncate text-sm">Auto Refresh</span>
        <SettingsSelect
          value={autoUpdateInterval}
          options={AUTO_UPDATE_OPTIONS}
          ariaLabel="Auto-update interval"
          onChange={onAutoUpdateIntervalChange}
        />
      </li>
    </ul>
  </section>

  <section>
    {@render groupTitle("Appearance")}
    <ul class="ui-list divide-y divide-border">
      <li class="flex items-center gap-2 px-3 py-2.5">
        <span class="min-w-0 flex-1 truncate text-sm">Theme</span>
        <SettingsSelect
          value={themeMode}
          options={THEME_OPTIONS}
          ariaLabel="Theme mode"
          onChange={onThemeModeChange}
        />
      </li>
    </ul>
  </section>

  <section>
    {@render groupTitle("Usage Display")}
    <ul class="ui-list divide-y divide-border">
      <li class="flex items-center gap-2 px-3 py-2.5">
        <span class="min-w-0 flex-1 truncate text-sm">Show Usage As</span>
        <SettingsSelect
          value={displayMode}
          options={DISPLAY_MODE_OPTIONS}
          ariaLabel="Usage display mode"
          onChange={onDisplayModeChange}
        />
      </li>
      <li class="flex items-center gap-2 px-3 py-2.5">
        <span class="min-w-0 flex-1 truncate text-sm">Reset Times</span>
        <SettingsSelect
          value={resetTimerDisplayMode}
          options={RESET_TIMER_DISPLAY_OPTIONS}
          ariaLabel="Reset timer display mode"
          onChange={onResetTimerDisplayModeChange}
        />
      </li>
    </ul>
  </section>

  <section>
    {@render groupTitle("5-hour leftover")}
    <ul class="ui-list divide-y divide-border">
      <li class="flex items-center gap-2 px-3 py-2.5">
        <span class="min-w-0 flex-1 truncate text-sm">From</span>
        <SettingsSelect
          value={crossingGoRemainingMinutes}
          options={CROSSING_GO_REMAINING_OPTIONS}
          ariaLabel="5-hour leftover from"
          onChange={onCrossingGoRemainingMinutesChange}
        />
      </li>
      <li class="flex items-center gap-2 px-3 py-2.5">
        <span class="min-w-0 flex-1 truncate text-sm">Notify</span>
        <Switch
          checked={leftoverNotifyEnabled}
          aria-label="Notify 5-hour leftover"
          onCheckedChange={(checked) => onLeftoverNotifyEnabledChange(checked)}
        />
      </li>
    </ul>
  </section>

  <div class="space-y-3">
    <button
      type="button"
      onclick={() => appUiController.setScreen("customize")}
      class="ui-nav-row ui-pressable"
    >
      <SlidersHorizontal class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold">Customize</span>
        <span class="block truncate text-xs text-muted-foreground">Choose what's visible and where</span>
      </span>
      <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  </div>

  <section>
    {@render groupTitle("About")}
    <button
      type="button"
      onclick={() => appUiController.setShowAbout(true)}
      class="ui-nav-row ui-pressable"
    >
      <Info class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      <span class="min-w-0 flex-1">
        <span class="block truncate text-sm font-semibold">Quotracker</span>
        <span class="block truncate text-xs text-muted-foreground">v{version} · Changelog & credits</span>
      </span>
      <ChevronRight class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  </section>
</div>
