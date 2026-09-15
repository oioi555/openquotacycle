<script lang="ts">
  import Play from "@lucide/svelte/icons/play";
  import Button from "./ui/button.svelte";

  let {
    title,
    description,
    onCancel,
    onConfirm,
  }: {
    title: string;
    description: string;
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
    aria-labelledby="window-starter-run-title"
    aria-describedby="window-starter-run-description"
    class="bg-card rounded-md border shadow-xl p-6 max-w-xs w-full mx-4 animate-in fade-in zoom-in-95 duration-200"
  >
    <div class="mx-auto mb-3 flex size-10 items-center justify-center rounded-full bg-primary/10 text-primary">
      <Play class="size-5" />
    </div>
    <h2 id="window-starter-run-title" class="text-base font-semibold text-center mb-1">
      {title}
    </h2>
    <p id="window-starter-run-description" class="text-sm text-muted-foreground text-center mb-5">
      {description}
    </p>
    <div class="flex gap-2 justify-center">
      <Button variant="outline" onclick={onCancel}>Cancel</Button>
      <Button onclick={onConfirm}>Run</Button>
    </div>
  </div>
</div>
