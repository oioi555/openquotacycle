<script lang="ts">
  import ChangelogDialog from "./changelog-dialog.svelte";
  import Button from "./ui/button.svelte";
  import { openUrl } from "../lib/backend";

  let {
    version,
    onClose,
  }: {
    version: string;
    onClose: () => void;
  } = $props();

  let view = $state<"about" | "changelog">("about");

  // Close on ESC key (about view only; changelog hands ESC to its own handler)
  $effect(() => {
    if (view !== "about") return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  // Close when panel hides (loses visibility)
  $effect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        onClose();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  });

  function handleBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      onClose();
    }
  }
</script>

{#if view === "changelog"}
  <ChangelogDialog
    currentVersion={version}
    onBack={() => (view = "about")}
    // In changelog view, Escape should go back to About instead of closing
    // the entire dialog.
    onClose={() => (view = "about")}
  />
{:else}
  <!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions: backdrop dismiss is mouse-only; keyboard uses Escape (see $effect above) -->
  <div
    class="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm rounded-md"
    onclick={handleBackdropClick}
  >
    <div class="bg-card rounded-md border shadow-xl p-6 max-w-xs w-full mx-4 text-center animate-in fade-in zoom-in-95 duration-200">
      <img src="/icon.svg" alt="OpenQuotaCycle" class="w-16 h-16 mx-auto mb-3 rounded-xl" />

      <h2 class="text-xl font-semibold mb-1">OpenQuotaCycle</h2>

      <div class="flex flex-col items-center gap-2 mb-4">
        <span class="inline-block text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          v{version}
        </span>
        <Button size="xs" variant="outline" onclick={() => (view = "changelog")} class="text-[10px] h-5 px-1.5">
          View Changelog
        </Button>
      </div>

      <div class="text-sm text-muted-foreground space-y-1">
        <p>
          Built by
          <button
            type="button"
            onclick={() => openUrl("https://github.com/oioi555").catch(console.error)}
            class="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            oioi555
          </button>
        </p>
        <p>
          UX reference
          <button
            type="button"
            onclick={() => openUrl("https://github.com/deviffyy/OpenQuota").catch(console.error)}
            class="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            OpenQuota
          </button>
        </p>
        <p>
          Linux old-Tauri base
          <button
            type="button"
            onclick={() => openUrl("https://github.com/debba/tuxmeter").catch(console.error)}
            class="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            Tuxmeter
          </button>
        </p>
        <p>
          Original idea by
          <button
            type="button"
            onclick={() => openUrl("https://github.com/robinebers").catch(console.error)}
            class="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            Robin Ebers
          </button>
        </p>
        <p>
          Open source on
          <button
            type="button"
            onclick={() => openUrl("https://github.com/oioi555/openquotacycle").catch(console.error)}
            class="text-primary hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-sm"
          >
            GitHub
          </button>
        </p>
      </div>
    </div>
  </div>
{/if}
