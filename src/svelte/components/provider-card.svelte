<script lang="ts">
  import { ChevronDown, ExternalLink, Hourglass, RefreshCw } from "@lucide/svelte";
  import Button, { buttonVariants } from "./ui/button.svelte";
  import Tooltip from "./ui/tooltip.svelte";
  import TooltipContent from "./ui/tooltip-content.svelte";
  import TooltipTrigger from "./ui/tooltip-trigger.svelte";
  import SkeletonLines from "./skeleton-lines.svelte";
  import PluginError from "./plugin-error.svelte";
  import MetricLine from "./metric-line.svelte";
  import { cn } from "@/lib/utils";
  import { openUrl } from "../lib/backend";
  import { darkModeController } from "../hooks/use-dark-mode.svelte";
  import { NowTickerController } from "../hooks/now-ticker.svelte";
  import { getIconColor } from "@/lib/color";
  import { REFRESH_COOLDOWN_MS, type DisplayMode, type ResetTimerDisplayMode } from "@/lib/settings";
  import type {
    ManifestLine,
    MetricLine as MetricLineData,
    PluginLink,
    StatusChip,
    StatusTone,
  } from "@/lib/plugin-types";
  import { groupLinesByType } from "@/lib/group-lines-by-type";
  import {
    filterProgressLines,
    orderLinesByLabels,
    overviewScopeFilter,
  } from "../lib/filter-progress-lines";
  import { ANTIGRAVITY_START_AGY_NOTICE } from "@/lib/antigravity-wake";

  let {
    name,
    plan,
    iconUrl,
    brandColor,
    links = [],
    loading = false,
    refreshing = false,
    error = null,
    staleError = null,
    statuses = [],
    lines = [],
    skeletonLines = [],
    lastManualRefreshAt = null,
    lastUpdatedAt = null,
    onRetry,
    onStartAgy,
    showStartAgy = false,
    startAgyBusy = false,
    wakeAriaLabel = "Start agy",
    wakeTooltip = "Start agy to refresh the session",
    wakeNotice = ANTIGRAVITY_START_AGY_NOTICE,
    scopeFilter = "all",
    hiddenProgressLabels = [],
    displayMode,
    resetTimerDisplayMode = "relative",
    onResetTimerDisplayModeToggle,
    onDisplayModeToggle,
    crossingGoRemainingMs,
    // Expandable dashboard cards: collapsed shows the Always Visible summary,
    // expanded reveals On-Demand lines + quick links (never deletes data).
    expandable = false,
    expanded = false,
    onToggleExpand,
    onHeaderContextMenu,
    // Stored per-provider display order of progress line labels.
    lineLabelsOrder = [],
    now: nowProp,
  }: {
    name: string;
    plan?: string;
    iconUrl?: string;
    brandColor?: string;
    links?: PluginLink[];
    loading?: boolean;
    refreshing?: boolean;
    error?: string | null;
    staleError?: string | null;
    statuses?: StatusChip[];
    lines?: MetricLineData[];
    skeletonLines?: ManifestLine[];
    lastManualRefreshAt?: number | null;
    lastUpdatedAt?: number | null;
    onRetry?: () => void;
    onStartAgy?: () => void;
    showStartAgy?: boolean;
    startAgyBusy?: boolean;
    wakeAriaLabel?: string;
    wakeTooltip?: string;
    wakeNotice?: string;
    scopeFilter?: "overview" | "all";
    hiddenProgressLabels?: string[];
    displayMode: DisplayMode;
    resetTimerDisplayMode?: ResetTimerDisplayMode;
    onResetTimerDisplayModeToggle?: () => void;
    onDisplayModeToggle?: () => void;
    crossingGoRemainingMs?: number;
    expandable?: boolean;
    expanded?: boolean;
    onToggleExpand?: () => void;
    onHeaderContextMenu?: (event: MouseEvent) => void;
    lineLabelsOrder?: string[];
    now?: number;
  } = $props();

  const isDark = $derived(darkModeController.isDark);
  const revealAll = $derived(expandable && expanded);

  // Filter lines based on scope - match by label since runtime lines can differ
  // from the manifest.
  const overviewLabels = $derived(overviewScopeFilter(skeletonLines));
  const scopedSkeletonLines = $derived(
    scopeFilter === "all"
      ? skeletonLines
      : skeletonLines.filter((line) => line.scope === "overview"),
  );
  const hiddenProgressLabelSet = $derived(new Set(hiddenProgressLabels));
  const effectiveHiddenProgressSet = $derived(revealAll ? new Set<string>() : hiddenProgressLabelSet);
  const filteredSkeletonLines = $derived(
    orderLinesByLabels(
      filterProgressLines(scopedSkeletonLines, effectiveHiddenProgressSet),
      lineLabelsOrder,
    ),
  );
  const scopedLines = $derived(
    scopeFilter === "all" ? lines : lines.filter((line) => overviewLabels.has(line.label)),
  );
  // On-Demand classification (collapsed-state): progress and text lines in
  // the hidden set. Badges are always visible.
  const isOnDemandLine = (line: MetricLineData): boolean =>
    (line.type === "progress" || line.type === "text") &&
    hiddenProgressLabelSet.has(line.label);
  // The divider sits between Always Visible and On-Demand so its position
  // never moves on expand: content grows below it, like OpenQuota.
  const alwaysLines = $derived(
    orderLinesByLabels(
      scopedLines.filter((line) => !isOnDemandLine(line)),
      lineLabelsOrder,
    ),
  );
  const onDemandLines = $derived(
    orderLinesByLabels(
      scopedLines.filter(isOnDemandLine),
      lineLabelsOrder,
    ),
  );

  const hasResetCountdown = $derived(
    scopedLines.some((line) => line.type === "progress" && Boolean(line.resetsAt)),
  );
  const cooldownRemainingMs = $derived(
    lastManualRefreshAt
      ? Math.max(0, REFRESH_COOLDOWN_MS - (Date.now() - lastManualRefreshAt))
      : 0,
  );
  const inCooldown = $derived(
    lastManualRefreshAt ? Date.now() - lastManualRefreshAt < REFRESH_COOLDOWN_MS : false,
  );

  const ticker = new NowTickerController();
  const now = $derived(nowProp ?? ticker.now);

  $effect(() => {
    if (nowProp !== undefined) {
      ticker.stop();
      return;
    }
    const enabled = cooldownRemainingMs > 0 || hasResetCountdown;
    ticker.start({
      enabled,
      intervalMs: cooldownRemainingMs > 0 ? 1000 : 30_000,
      stopAfterMs: cooldownRemainingMs > 0 && !hasResetCountdown ? cooldownRemainingMs : null,
    });
    return () => ticker.stop();
  });

  const visibleLinks = $derived(
    links
      .map((link) => ({
        label: link.label.trim(),
        url: link.url.trim(),
      }))
      .filter(
        (link) =>
          link.label.length > 0 &&
          link.url.length > 0 &&
          (link.url.startsWith("https://") || link.url.startsWith("http://")),
      ),
  );
  const showLinks = $derived(!expandable || expanded);
  const linkColumns = $derived(Math.min(3, Math.max(1, visibleLinks.length)));
  // Count only lines/links that expand would actually reveal. Manifest
  // On-Demand labels omitted from this probe (auto-hide) must not keep a
  // chevron that opens to an empty card.
  const hasOnDemand = $derived(
    expandable && (onDemandLines.length > 0 || visibleLinks.length > 0),
  );

  const formatRemainingTime = $derived.by(() => {
    if (!lastManualRefreshAt) return "";
    const remainingMs = REFRESH_COOLDOWN_MS - (now - lastManualRefreshAt);
    if (remainingMs <= 0) return "";
    const totalSeconds = Math.ceil(remainingMs / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `Available in ${minutes}m ${seconds}s` : `Available in ${seconds}s`;
  });

  function statusToneClass(tone: StatusTone): string {
    if (tone === "positive") return "text-green-500";
    if (tone === "danger") return "text-meter-critical";
    if (tone === "warning") return "text-meter-warning";
    return "text-muted-foreground";
  }

  function formatRelativeTime(diffMs: number): string {
    if (diffMs < 60_000) return "just now";
    const minutes = Math.floor(diffMs / 60_000);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  }

  function handleCardClick(event: MouseEvent): void {
    if (!hasOnDemand) return;
    const target = event.target;
    if (!(target instanceof Element)) return;
    if (target.closest("button, a, [role='button'], [role='switch']")) return;
    onToggleExpand?.();
  }
</script>

{#snippet lineGroups(groupedLines: MetricLineData[])}
  {#each groupLinesByType(groupedLines) as group}
    {#if group.kind === "text"}
      <div class="space-y-1">
        {#each group.lines as line}
          <MetricLine
            {line}
            {displayMode}
            {resetTimerDisplayMode}
            {onResetTimerDisplayModeToggle}
            {onDisplayModeToggle}
            {now}
            {refreshing}
            pluginLines={lines ?? []}
            {crossingGoRemainingMs}
          />
        {/each}
      </div>
    {:else}
      {#each group.lines as line}
        <MetricLine
          {line}
          {displayMode}
          {resetTimerDisplayMode}
          {onResetTimerDisplayModeToggle}
          {onDisplayModeToggle}
          {now}
          {refreshing}
          pluginLines={lines ?? []}
          {crossingGoRemainingMs}
        />
      {/each}
    {/if}
  {/each}
{/snippet}

{#snippet startAgyAction()}
  <Tooltip>
    <TooltipTrigger
      type="button"
      class={cn(buttonVariants({ variant: "outline", size: "icon-xs" }), "shrink-0")}
      disabled={startAgyBusy}
      aria-busy={startAgyBusy}
      aria-label={wakeAriaLabel}
      onclick={onStartAgy}
    >
      <RefreshCw
        aria-hidden="true"
        class={cn("h-3 w-3", startAgyBusy && "animate-spin motion-reduce:animate-none")}
      />
    </TooltipTrigger>
    <TooltipContent side="top">{wakeTooltip}</TooltipContent>
  </Tooltip>
{/snippet}

<div
  role="group"
  aria-label={name}
  oncontextmenu={(event) => onHeaderContextMenu?.(event)}
>
  <div class="px-1 pt-1">
    <div class="flex items-center justify-between gap-2 mb-1">
      <div class="flex items-center gap-2 min-w-0">
        <h2 class="text-sm font-semibold truncate" style:transform="translateZ(0)">{name}</h2>
        {#if plan}
          <span class="truncate shrink-0 text-[11px] leading-none text-muted-foreground" title={plan}>
            {plan}
          </span>
        {/if}
        {#each statuses as chip (chip.text)}
          <span
            class={cn(
              "truncate shrink-0 text-[11px] leading-none font-medium",
              statusToneClass(chip.tone),
            )}
            title={chip.text}
          >
            {chip.text}
          </span>
        {/each}
      </div>
      <div class="flex items-center gap-1.5 shrink-0">
        {#if onRetry}
          {#if loading || refreshing}
            <Button
              variant="ghost"
              size="icon-xs"
              class="pointer-events-none opacity-50"
              style="transform: translateZ(0); backface-visibility: hidden"
              tabindex={-1}
            >
              <RefreshCw class="h-3 w-3 animate-spin motion-reduce:animate-none" />
            </Button>
          {:else if inCooldown}
            <Tooltip>
              <TooltipTrigger
                class={cn(
                  buttonVariants({ variant: "ghost", size: "icon-xs" }),
                  "pointer-events-none opacity-50",
                )}
                tabindex={-1}
              >
                <Hourglass class="h-3 w-3" />
              </TooltipTrigger>
              <TooltipContent side="top">{formatRemainingTime}</TooltipContent>
            </Tooltip>
          {:else}
            <Tooltip>
              <TooltipTrigger
                class={cn(
                  buttonVariants({ variant: "ghost", size: "icon-xs" }),
                  "opacity-0 hover:opacity-100 focus-visible:opacity-100",
                )}
                aria-label="Retry"
                onclick={() => {
                  onRetry();
                }}
              >
                <RefreshCw class="h-3 w-3" />
              </TooltipTrigger>
              {#if lastUpdatedAt != null}
                <TooltipContent side="top">
                  Updated {formatRelativeTime(Date.now() - lastUpdatedAt)}
                </TooltipContent>
              {/if}
            </Tooltip>
          {/if}
        {/if}
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
        {/if}
      </div>
    </div>
  </div>

  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <!-- svelte-ignore a11y_no_static_element_interactions -->
  <div
    class={cn(
      "ui-card ui-pressable px-3.5 pt-[15px] transition-colors hover:bg-card-hover",
      hasOnDemand ? "cursor-pointer pb-2" : "pb-[15px]",
    )}
    onclick={hasOnDemand ? handleCardClick : undefined}
  >
    {#if error}
      <PluginError
        message={error}
        action={showStartAgy && onStartAgy ? startAgyAction : undefined}
      />
    {:else if staleError || (showStartAgy && onStartAgy)}
      <div class="mb-2">
        <PluginError
          message={staleError ?? wakeNotice}
          action={showStartAgy && onStartAgy ? startAgyAction : undefined}
        />
      </div>
    {/if}

    {#if loading && !error && !staleError && !refreshing}
      <SkeletonLines lines={filteredSkeletonLines} />
    {/if}

    {#if (!loading && !error) || refreshing}
      <div class="space-y-1.5">
        {@render lineGroups(alwaysLines)}
      </div>
    {/if}
    {#if hasOnDemand}
      <div data-slot="card-expand-slot" class="flex w-full items-center justify-center py-1">
        <button
          type="button"
          aria-expanded={expanded}
          aria-label={expanded ? `Collapse ${name}` : `Expand ${name}`}
          onclick={onToggleExpand}
          class="flex cursor-pointer items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
        >
          <ChevronDown class={cn("size-2.5 transition-transform", expanded && "-rotate-180")} />
        </button>
      </div>
    {/if}
    {#if (((!loading && !error) || refreshing) && revealAll && onDemandLines.length > 0)}
      <div class="space-y-1.5 pt-1">
        {@render lineGroups(onDemandLines)}
      </div>
    {/if}
    {#if showLinks && visibleLinks.length > 0}
      <div
        data-slot="provider-links"
        class="mt-2 grid gap-1.5"
        style="--provider-link-columns: {linkColumns}; grid-template-columns: repeat(var(--provider-link-columns), minmax(0, 1fr))"
      >
        {#each visibleLinks as link}
          <Button
            variant="outline"
            size="xs"
            class="h-[26px] w-full min-w-0 shrink justify-center gap-1 px-2 text-[10px] font-semibold shadow-none"
            aria-label="{link.label}, opens in browser"
            onclick={() => {
              openUrl(link.url).catch(console.error);
            }}
          >
            <span class="truncate">{link.label}</span>
            <ExternalLink class="size-2.5" />
          </Button>
        {/each}
      </div>
    {/if}
  </div>
</div>
