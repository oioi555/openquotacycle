<script lang="ts">
  import QuotaResetTimeline from "../components/quota-reset-timeline/quota-reset-timeline.svelte";
  import WindowStarterPage from "./window-starter.svelte";
  import type { DisplayPluginState } from "../controllers/plugin-views.svelte";
  import { selectQuotaTimelineRows } from "@/lib/quota-timeline/select";
  import type { WindowStarterAttempt } from "@/lib/window-starter";
  import type { WindowStarterProviderView } from "@/lib/window-starter-state";

  let {
    plugins,
    starterEnabled = false,
    starterHistoryReady = true,
    starterProviders = [],
    starterAttempts = [],
    onStarterEnabledChange,
    onStarterWindowParticipation,
    onStarterCustomize,
    onStarterManualRun,
    now,
  }: {
    plugins: DisplayPluginState[];
    starterEnabled?: boolean;
    starterHistoryReady?: boolean;
    starterProviders?: WindowStarterProviderView[];
    starterAttempts?: WindowStarterAttempt[];
    onStarterEnabledChange?: (enabled: boolean) => void;
    onStarterWindowParticipation?: (pluginId: string, windowId: string, enabled: boolean) => void;
    onStarterCustomize?: (pluginId: string) => void;
    onStarterManualRun?: (provider: WindowStarterProviderView) => void;
    now?: number;
  } = $props();

  const hasRows = $derived(
    selectQuotaTimelineRows(plugins, "five-hour").length > 0 ||
      selectQuotaTimelineRows(plugins, "weekly").length > 0,
  );
</script>

<div class="space-y-4 py-3">
  {#if hasRows}
    <QuotaResetTimeline {plugins} {now} />
  {:else}
    <div class="ui-card-bordered px-3 py-6 text-center text-sm text-muted-foreground">
      No upcoming resets
    </div>
  {/if}

  <WindowStarterPage
    enabled={starterEnabled}
    historyReady={starterHistoryReady}
    providers={starterProviders}
    attempts={starterAttempts}
    onEnabledChange={onStarterEnabledChange ?? (() => {})}
    onWindowParticipation={onStarterWindowParticipation}
    onCustomize={onStarterCustomize}
    onManualRun={onStarterManualRun}
  />
</div>
