<script lang="ts">
  import Power from "@lucide/svelte/icons/power";
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import Play from "@lucide/svelte/icons/play";

  let {
    x,
    y,
    participationEnabled,
    customizeEnabled,
    runEnabled,
    onAction,
    onClose,
  }: {
    x: number;
    y: number;
    participationEnabled: boolean;
    customizeEnabled: boolean;
    runEnabled: boolean;
    onAction: (action: "toggle" | "customize" | "run") => void;
    onClose: () => void;
  } = $props();

  let menuEl: HTMLElement | undefined = $state();

  const left = $derived(Math.max(4, Math.min(x, window.innerWidth - 184)));
  const top = $derived(Math.max(4, Math.min(y, window.innerHeight - 160)));

  function pick(action: "toggle" | "customize" | "run"): void {
    onAction(action);
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
  aria-label="Window Starter target actions"
  class="ui-menu fixed z-50 w-44"
  style:left={`${left}px`}
  style:top={`${top}px`}
>
  <button type="button" role="menuitem" onclick={() => pick("toggle")} class="ui-menu-item">
    <Power aria-hidden="true" />{participationEnabled ? "Turn off" : "Turn on"}
  </button>
  <button
    type="button"
    role="menuitem"
    disabled={!customizeEnabled}
    onclick={() => pick("customize")}
    class="ui-menu-item"
  >
    <SlidersHorizontal aria-hidden="true" />Customize…
  </button>
  <hr class="ui-menu-separator" />
  <button
    type="button"
    role="menuitem"
    disabled={!runEnabled}
    onclick={() => pick("run")}
    class="ui-menu-item"
  >
    <Play aria-hidden="true" />Run now…
  </button>
</div>
