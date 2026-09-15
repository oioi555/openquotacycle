<script lang="ts">
  import RefreshCw from "@lucide/svelte/icons/refresh-cw";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import Power from "@lucide/svelte/icons/power";
  import CodeXml from "@lucide/svelte/icons/code-xml";
  import { openDevtools } from "../lib/backend";
  import type { ProviderContextMenuAction } from "../lib/view-types";

  let {
    x,
    y,
    refreshEnabled,
    onAction,
    onClose,
  }: {
    x: number;
    y: number;
    refreshEnabled: boolean;
    onAction: (action: ProviderContextMenuAction) => void;
    onClose: () => void;
  } = $props();

  let menuEl: HTMLElement | undefined = $state();

  const left = $derived(Math.max(4, Math.min(x, window.innerWidth - 184)));
  const top = $derived(Math.max(4, Math.min(y, window.innerHeight - 180)));

  function pick(action: ProviderContextMenuAction): void {
    onAction(action);
    onClose();
  }

  function inspect(): void {
    openDevtools().catch(console.error);
    onClose();
  }

  $effect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (menuEl && !menuEl.contains(event.target as Node)) onClose();
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  });
</script>

<div
  bind:this={menuEl}
  role="menu"
  aria-label="Provider actions"
  class="ui-menu fixed z-50 w-44"
  style:left={`${left}px`}
  style:top={`${top}px`}
>
  <button
    type="button"
    role="menuitem"
    disabled={!refreshEnabled}
    onclick={() => pick("reload")}
    class="ui-menu-item"
  >
    <RefreshCw aria-hidden="true" />Refresh usage
  </button>
  <button
    type="button"
    role="menuitem"
    onclick={() => pick("customize")}
    class="ui-menu-item"
  >
    <SlidersHorizontal aria-hidden="true" />Customize…
  </button>
  <hr class="ui-menu-separator" />
  <button
    type="button"
    role="menuitem"
    onclick={() => pick("remove")}
    class="ui-menu-item text-destructive"
  >
    <Power aria-hidden="true" />Disable plugin
  </button>
  <button
    type="button"
    role="menuitem"
    onclick={inspect}
    class="ui-menu-item"
  >
    <CodeXml aria-hidden="true" />Inspect Element
  </button>
</div>
