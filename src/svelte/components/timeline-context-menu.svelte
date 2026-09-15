<script lang="ts">
  import SlidersHorizontal from "@lucide/svelte/icons/sliders-horizontal";
  import EyeOff from "@lucide/svelte/icons/eye-off";

  let {
    x,
    y,
    onAction,
    onClose,
  }: {
    x: number;
    y: number;
    onAction: (action: "customize" | "hide") => void;
    onClose: () => void;
  } = $props();

  let menuEl: HTMLElement | undefined = $state();

  const left = $derived(Math.max(4, Math.min(x, window.innerWidth - 184)));
  const top = $derived(Math.max(4, Math.min(y, window.innerHeight - 96)));

  function pick(action: "customize" | "hide"): void {
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
  aria-label="Timeline actions"
  class="ui-menu fixed z-50 w-44"
  style:left={`${left}px`}
  style:top={`${top}px`}
>
  <button type="button" role="menuitem" onclick={() => pick("customize")} class="ui-menu-item">
    <SlidersHorizontal aria-hidden="true" />Customize…
  </button>
  <button type="button" role="menuitem" onclick={() => pick("hide")} class="ui-menu-item">
    <EyeOff aria-hidden="true" />Hide Timeline
  </button>
</div>
