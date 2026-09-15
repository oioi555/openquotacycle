<script lang="ts">
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Button from "./ui/button.svelte";

  let {
    onCancel,
    onConfirm,
  }: {
    onCancel: () => void;
    onConfirm: () => void;
  } = $props();

  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      onCancel();
    }
  }
</script>

<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions: backdrop dismiss is mouse-only; keyboard uses Escape (see $effect above) -->
<div
  class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-md"
  onclick={handleBackdropClick}
>
  <div
    role="alertdialog"
    aria-modal="true"
    aria-labelledby="reset-all-title"
    aria-describedby="reset-all-description"
    class="bg-card rounded-md border shadow-xl p-6 max-w-xs w-full mx-4 animate-in fade-in zoom-in-95 duration-200"
  >
    <div class="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-destructive/10 text-destructive">
      <TriangleAlert class="size-5" />
    </div>
    <h2 id="reset-all-title" class="text-base font-semibold text-center mb-1">
      Reset All Customization?
    </h2>
    <p id="reset-all-description" class="text-sm text-muted-foreground text-center mb-5">
      This turns installed providers back on, restores every provider's
      metric visibility and order, and returns Window Starter participation,
      runner, and window picks to plugin defaults. The global Window Starter
      switch is unchanged.
    </p>
    <div class="flex gap-2 justify-center">
      <Button variant="outline" onclick={onCancel}>Cancel</Button>
      <Button variant="destructive" onclick={onConfirm}>Reset All</Button>
    </div>
  </div>
</div>
