<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import Hourglass from "@lucide/svelte/icons/hourglass";
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import RotateCcw from "@lucide/svelte/icons/rotate-ccw";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import { formatAutoRefreshCountdown } from "../lib/auto-refresh-countdown";
  import { NowTickerController } from "../hooks/now-ticker.svelte";
  import Button from "./ui/button.svelte";

  let {
    title,
    onBack,
    onRefresh,
    refreshTitle = "Refresh",
    refreshIcon = "refresh",
    autoUpdateNextAt,
    now: nowProp,
  }: {
    title: string;
    onBack?: () => void;
    onRefresh?: () => void;
    refreshTitle?: string;
    refreshIcon?: "refresh" | "reset" | "sliders";
    autoUpdateNextAt?: number | null;
    now?: number;
  } = $props();

  const showCountdown = $derived(refreshIcon === "refresh" && autoUpdateNextAt !== undefined);
  const nowTicker = new NowTickerController();
  const now = $derived(nowProp ?? nowTicker.now);

  $effect(() => {
    if (nowProp !== undefined) {
      nowTicker.stop();
      return;
    }
    nowTicker.start({ enabled: showCountdown && autoUpdateNextAt != null });
    return () => nowTicker.stop();
  });

  const countdown = $derived(
    showCountdown ? formatAutoRefreshCountdown(autoUpdateNextAt ?? null, now) : null,
  );
  // Overview has no Back: status lives on the left. Nested Refresh screens
  // keep the compact face on the button.
  const countdownOnLeft = $derived(Boolean(countdown) && !onBack);
  const countdownOnButton = $derived(Boolean(countdown) && Boolean(onBack));
</script>

<div
  class="grid h-11 shrink-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-1 border-b px-2"
>
  <div class="flex min-w-0 justify-start">
    {#if onBack}
      <Button variant="ghost" size="icon-sm" aria-label="Back" onclick={onBack}>
        <ChevronLeft class="size-4" />
      </Button>
    {:else if countdownOnLeft && countdown}
      <span
        class="flex items-center gap-1 px-1.5 text-[11px] font-medium tabular-nums text-muted-foreground"
        title={countdown.label}
        aria-label={countdown.label}
      >
        <Hourglass class="size-3.5 shrink-0" aria-hidden="true" />
        {countdown.face}
      </span>
    {/if}
  </div>
  <h1 class="max-w-full truncate text-center text-sm font-semibold">{title}</h1>
  <div class="flex justify-end">
    {#if onRefresh}
      <Button
        variant="ghost"
        size={countdownOnButton ? "sm" : "icon-sm"}
        aria-label={countdownOnButton ? `${refreshTitle} · ${countdown?.label}` : refreshTitle}
        title={countdownOnButton ? `Refresh now · ${countdown?.label}` : refreshTitle}
        onclick={onRefresh}
      >
        {#if countdownOnButton && countdown}
          <span class="text-[11px] font-medium tabular-nums text-muted-foreground">{countdown.face}</span>
        {/if}
        {#if refreshIcon === "reset"}
          <RotateCcw class="size-4" />
        {:else if refreshIcon === "sliders"}
          <SlidersHorizontal class="size-4" />
        {:else}
          <RefreshCw class="size-4" />
        {/if}
      </Button>
    {:else}
      <span class="size-8" aria-hidden="true"></span>
    {/if}
  </div>
</div>
