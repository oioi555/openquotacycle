<script lang="ts">
  import Info from "@lucide/svelte/icons/info";
  import X from "@lucide/svelte/icons/x";
  import Tooltip from "./ui/tooltip.svelte";
  import TooltipContent from "./ui/tooltip-content.svelte";
  import TooltipTrigger from "./ui/tooltip-trigger.svelte";
  import { cn } from "@/lib/utils";
  import type { GlobalShortcut } from "@/lib/settings";
  import {
    buildShortcutFromCodes,
    detectShortcutPlatform,
    formatShortcutForDisplay,
  } from "../lib/shortcut-capture";

  let {
    globalShortcut,
    onGlobalShortcutChange,
  }: {
    globalShortcut: GlobalShortcut;
    onGlobalShortcutChange: (value: GlobalShortcut) => void;
  } = $props();

  const platform = detectShortcutPlatform();

  let isRecording = $state(false);
  let pressedCodes = new Set<string>();
  let pendingShortcut: string | null = $state(null);
  let pendingDisplay: string = $state("");
  let recordingEl: HTMLDivElement | undefined = $state();

  $effect(() => {
    if (isRecording && recordingEl) {
      const timer = setTimeout(() => {
        recordingEl?.focus();
      }, 10);
      return () => clearTimeout(timer);
    }
  });

  function startRecording(): void {
    isRecording = true;
    pressedCodes = new Set();
    pendingShortcut = null;
    pendingDisplay = "";
  }

  function stopRecording(): void {
    isRecording = false;
    pressedCodes = new Set();
    pendingShortcut = null;
    pendingDisplay = "";
  }

  function handleKeyDown(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();

    if (event.code === "Escape") {
      onGlobalShortcutChange(null);
      stopRecording();
      return;
    }

    pressedCodes.add(event.code);

    const { display, tauri } = buildShortcutFromCodes(pressedCodes, platform);
    pendingDisplay = display;
    if (tauri) {
      pendingShortcut = tauri;
    }
  }

  function handleKeyUp(event: KeyboardEvent): void {
    event.preventDefault();
    event.stopPropagation();

    pressedCodes.delete(event.code);

    if (pressedCodes.size === 0 && pendingShortcut) {
      onGlobalShortcutChange(pendingShortcut);
      stopRecording();
    }
  }

  function handleClear(event: MouseEvent): void {
    event.stopPropagation();
    onGlobalShortcutChange(null);
  }

  const displayValue = $derived.by(() => {
    if (isRecording) {
      return pendingDisplay || "Press keys...";
    }
    return globalShortcut ? formatShortcutForDisplay(globalShortcut, platform) : "Record Shortcut";
  });

  const hasShortcut = $derived(globalShortcut !== null);
</script>

<li class="flex items-center gap-2 px-3 py-2.5">
  <span class="flex min-w-0 flex-1 items-center gap-1 text-sm">
    <span class="whitespace-nowrap">Global Shortcut</span>
    <Tooltip>
      <TooltipTrigger
        class="inline-flex shrink-0 p-0 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Shortcut info"
      >
        <Info class="size-3.5" />
      </TooltipTrigger>
      <TooltipContent side="right">
        Press Escape while recording to clear. On Wayland, shortcuts are managed by the system
        portal. Your desktop may prompt you to confirm or customize the binding.
      </TooltipContent>
    </Tooltip>
  </span>
  {#if isRecording}
    <div
      bind:this={recordingEl}
      tabindex={0}
      role="textbox"
      aria-label="Press keys to record shortcut"
      onkeydown={handleKeyDown}
      onkeyup={handleKeyUp}
      onblur={stopRecording}
      class={cn(
        "inline-flex h-8 max-w-[11rem] min-w-0 shrink-0 items-center rounded-md border-2 border-primary bg-muted/50 px-2.5 text-sm outline-none",
        !pendingDisplay && "text-muted-foreground",
      )}
    >
      <span class="min-w-0 truncate">{displayValue}</span>
    </div>
  {:else}
    <div
      class={cn(
        "ui-pressable inline-flex h-8 max-w-[11rem] min-w-0 shrink-0 cursor-pointer items-center gap-1.5 rounded-md border border-input bg-background px-2.5 text-left text-sm",
        !hasShortcut && "text-muted-foreground",
      )}
      onclick={startRecording}
      onkeydown={(e) => {
        if (e.key === "Enter" || e.key === " ") startRecording();
      }}
      role="button"
      tabindex={0}
      aria-label="Record shortcut"
    >
      <span class="min-w-0 truncate">{displayValue}</span>
      {#if hasShortcut}
        <button
          type="button"
          onclick={handleClear}
          class="shrink-0 rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          aria-label="Clear shortcut"
        >
          <X class="h-3.5 w-3.5" />
        </button>
      {/if}
    </div>
  {/if}
</li>
