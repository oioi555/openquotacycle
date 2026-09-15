<script lang="ts">
  import TimerReset from "@lucide/svelte/icons/timer-reset";
  import { getIconColor } from "@/lib/color";
  import type { PluginDisplayState } from "@/lib/plugin-types";
  import { CROSSING_GO_REMAINING_MS } from "@/lib/crossing-go";
  import { selectTimelineCardItems, type TimelineCardItem } from "@/lib/quota-timeline/card";
  import {
    TIMELINE_CADENCE_LABEL,
    type QuotaTimelineKind,
  } from "@/lib/quota-timeline/select";
  import {
    formatResetAbsoluteFace,
    formatResetAbsoluteLabel,
    formatResetRelativeFace,
    formatResetRelativeLabel,
  } from "@/lib/reset-tooltip";
  import {
    DEFAULT_TIMELINE_CARD_ROWS,
    type ResetTimerDisplayMode,
    type TimelineCardRowId,
  } from "@/lib/settings";
  import { CUSTOMIZE_TIMELINE_SCREEN, appUiController } from "../controllers/app-ui-controller.svelte";
  import { darkModeController } from "../hooks/use-dark-mode.svelte";
  import { NowTickerController } from "../hooks/now-ticker.svelte";
  import TimelineContextMenu from "./timeline-context-menu.svelte";
  import Tooltip from "./ui/tooltip.svelte";
  import TooltipContent from "./ui/tooltip-content.svelte";
  import TooltipTrigger from "./ui/tooltip-trigger.svelte";

  let {
    plugins,
    now = undefined,
    resetTimerDisplayMode = "relative",
    visibleRows = DEFAULT_TIMELINE_CARD_ROWS,
    onHide,
    crossingGoRemainingMs = CROSSING_GO_REMAINING_MS,
  }: {
    plugins: PluginDisplayState[];
    now?: number;
    resetTimerDisplayMode?: ResetTimerDisplayMode;
    visibleRows?: TimelineCardRowId[];
    onHide?: () => void;
    crossingGoRemainingMs?: number;
  } = $props();

  const ticker = new NowTickerController();
  const clock = $derived(now ?? ticker.now);
  $effect(() => {
    if (now !== undefined) {
      ticker.stop();
      return;
    }
    ticker.start({ enabled: true, intervalMs: 30_000 });
    return () => ticker.stop();
  });

  const isDark = $derived(darkModeController.isDark);
  const shownRows = $derived(new Set(visibleRows));
  const fiveHourItems = $derived(
    shownRows.has("five-hour")
      ? selectTimelineCardItems(plugins, "five-hour", clock, crossingGoRemainingMs)
      : [],
  );
  const weeklyItems = $derived(
    shownRows.has("weekly") ? selectTimelineCardItems(plugins, "weekly", clock) : [],
  );
  const hasItems = $derived(fiveHourItems.length > 0 || weeklyItems.length > 0);

  let contextMenu: { x: number; y: number } | null = $state(null);

  function goToTimeline(): void {
    appUiController.setScreen("timeline");
  }

  function openContextMenu(event: MouseEvent): void {
    event.preventDefault();
    contextMenu = { x: event.clientX, y: event.clientY };
  }

  function handleMenuAction(action: "customize" | "hide"): void {
    if (action === "customize") {
      appUiController.setScreen(CUSTOMIZE_TIMELINE_SCREEN);
      return;
    }
    onHide?.();
  }

  function faceOf(item: TimelineCardItem): string {
    const face =
      resetTimerDisplayMode === "absolute"
        ? formatResetAbsoluteFace(clock, item.iso)
        : formatResetRelativeFace(clock, item.iso);
    return face ?? "";
  }

  function remainingOf(item: TimelineCardItem): string {
    const remaining =
      resetTimerDisplayMode === "absolute"
        ? formatResetAbsoluteLabel(clock, item.iso)
        : formatResetRelativeLabel(clock, item.iso);
    return remaining ?? "";
  }

  function titleOf(item: TimelineCardItem): string {
    return [item.name, item.quotaLabel, remainingOf(item), item.headroomText]
      .filter(Boolean)
      .join(" · ");
  }

  function cadenceDrag(node: HTMLElement) {
    const threshold = 5;
    let pointerId: number | null = null;
    let startX = 0;
    let startScroll = 0;
    let dragging = false;
    let ignoreClick = false;

    function onDown(event: PointerEvent): void {
      if (event.button !== 0) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScroll = node.scrollLeft;
      dragging = false;
      ignoreClick = false;
      try {
        node.setPointerCapture(event.pointerId);
      } catch {
        /* jsdom */
      }
    }

    function onMove(event: PointerEvent): void {
      if (pointerId !== event.pointerId) return;
      const max = node.scrollWidth - node.clientWidth;
      if (max <= 0) return;
      const dx = event.clientX - startX;
      if (!dragging) {
        if (Math.abs(dx) < threshold) return;
        dragging = true;
        ignoreClick = true;
        node.classList.add("cursor-grabbing");
      }
      event.preventDefault();
      node.scrollLeft = Math.max(0, Math.min(max, startScroll - dx));
    }

    function onUp(event: PointerEvent): void {
      if (pointerId !== event.pointerId) return;
      pointerId = null;
      node.classList.remove("cursor-grabbing");
      try {
        if (node.hasPointerCapture(event.pointerId)) node.releasePointerCapture(event.pointerId);
      } catch {
        /* jsdom */
      }
      dragging = false;
    }

    function onClick(event: MouseEvent): void {
      if (!ignoreClick) return;
      ignoreClick = false;
      event.preventDefault();
      event.stopPropagation();
    }

    node.addEventListener("pointerdown", onDown);
    node.addEventListener("pointermove", onMove);
    node.addEventListener("pointerup", onUp);
    node.addEventListener("pointercancel", onUp);
    node.addEventListener("click", onClick, true);
    return {
      destroy() {
        node.removeEventListener("pointerdown", onDown);
        node.removeEventListener("pointermove", onMove);
        node.removeEventListener("pointerup", onUp);
        node.removeEventListener("pointercancel", onUp);
        node.removeEventListener("click", onClick, true);
      },
    };
  }
</script>

<div class="w-full">
  <button
    type="button"
    class="w-full cursor-pointer text-left"
    aria-label="Timeline"
    onclick={goToTimeline}
    oncontextmenu={openContextMenu}
  >
    <div class="px-1 pt-1">
      <div class="mb-1 flex items-center justify-between gap-2">
        <h2 class="truncate text-sm font-semibold" style:transform="translateZ(0)">Timeline</h2>
        <TimerReset class="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
  </button>
  <div
    class="ui-card ui-pressable cursor-pointer px-3.5 pt-[15px] pb-[15px] transition-colors hover:bg-card-hover"
    onclick={goToTimeline}
    oncontextmenu={openContextMenu}
    role="presentation"
  >
    {#if hasItems}
      <div class="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
        {#if fiveHourItems.length > 0}
          {@render cadenceRow("five-hour", fiveHourItems)}
        {/if}
        {#if weeklyItems.length > 0}
          {@render cadenceRow("weekly", weeklyItems)}
        {/if}
      </div>
    {:else}
      <p class="text-sm text-muted-foreground">No upcoming resets</p>
    {/if}
  </div>
</div>

{#if contextMenu}
  {@const menu = contextMenu}
  <TimelineContextMenu
    x={menu.x}
    y={menu.y}
    onAction={handleMenuAction}
    onClose={() => (contextMenu = null)}
  />
{/if}

{#snippet cadenceRow(kind: QuotaTimelineKind, items: TimelineCardItem[])}
  <span class="whitespace-nowrap text-[13px] leading-[17px] font-semibold"
    >{TIMELINE_CADENCE_LABEL[kind]}</span
  >
  <div
    data-slot="timeline-cadence-items"
    use:cadenceDrag
    class="flex w-full min-w-0 cursor-grab flex-nowrap items-center gap-x-2 overflow-x-auto overflow-y-hidden overscroll-x-contain scrollbar-none select-none"
  >
    {#each items as item (item.pluginId + item.quotaLabel)}
      <div class="shrink-0">
        <Tooltip>
          <TooltipTrigger
            class="inline-flex items-center gap-1 {item.crossingGo
              ? 'rounded-full bg-meter-fill/20 px-1.5 py-0.5'
              : ''}"
            aria-label={titleOf(item)}
            data-crossing-go={item.crossingGo ? "true" : undefined}
          >
            {#if item.iconUrl}
              <span
                role="img"
                aria-hidden="true"
                class="inline-block size-4 shrink-0"
                style:background-color={getIconColor(item.brandColor, isDark)}
                style:-webkit-mask-image={`url(${item.iconUrl})`}
                style:-webkit-mask-size="contain"
                style:-webkit-mask-repeat="no-repeat"
                style:-webkit-mask-position="center"
                style:mask-image={`url(${item.iconUrl})`}
                style:mask-size="contain"
                style:mask-repeat="no-repeat"
                style:mask-position="center"
              ></span>
            {/if}
            <span
              class="text-[12px] leading-4 tabular-nums {item.crossingGo
                ? 'font-semibold text-meter-fill'
                : 'text-muted-foreground'}">{faceOf(item)}</span
            >
          </TooltipTrigger>
          <TooltipContent side="top" class="max-w-[220px] text-center leading-snug">
            <span class="block">{item.name} · {item.quotaLabel}</span>
            {#if remainingOf(item)}
              <span class="block tabular-nums">{remainingOf(item)}</span>
            {/if}
            {#if item.headroomText}
              <span class="block tabular-nums">{item.headroomText}</span>
            {/if}
          </TooltipContent>
        </Tooltip>
      </div>
    {/each}
  </div>
{/snippet}
