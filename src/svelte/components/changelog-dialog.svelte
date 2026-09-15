<script lang="ts">
  import Loader2 from "@lucide/svelte/icons/loader-circle";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ExternalLinkIcon from "@lucide/svelte/icons/external-link";
  import { changelogController } from "../hooks/use-changelog.svelte";
  import Button from "./ui/button.svelte";
  import SimpleMarkdown from "./simple-markdown.svelte";
  import { openUrl } from "../lib/backend";

  let {
    currentVersion,
    onBack,
    onClose,
  }: {
    currentVersion: string;
    onBack: () => void;
    onClose: () => void;
  } = $props();

  $effect(() => {
    changelogController.fetchForVersion(currentVersion);
  });

  // Close on ESC key
  $effect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  });

  const releases = $derived(changelogController.releases);
  const loading = $derived(changelogController.loading);
  const error = $derived(changelogController.error);

  const currentRelease = $derived(
    releases.find(
      (r) =>
        r.tag_name === currentVersion ||
        r.tag_name === `v${currentVersion}` ||
        r.name === currentVersion ||
        r.name === `v${currentVersion}`,
    ),
  );
</script>

<div class="absolute inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px] rounded-md">
  <div class="bg-card rounded-md border shadow-2xl flex flex-col w-[92%] h-[88%] animate-in fade-in zoom-in-95 duration-200">
    <div class="flex items-center justify-between p-3.5 border-b bg-muted/20">
      <div class="flex items-center gap-2">
        <button
          onclick={onBack}
          class="p-1.5 hover:bg-muted rounded-md transition-colors text-muted-foreground hover:text-foreground"
          title="Back"
        >
          <ChevronRight class="w-5 h-5 rotate-180" />
        </button>
        <h2 class="font-semibold text-sm tracking-tight">Release Notes</h2>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-5 custom-scrollbar overflow-x-hidden">
      {#if loading}
        <div class="h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
          <Loader2 class="w-6 h-6 animate-spin" />
          <span class="text-xs">Fetching release info...</span>
        </div>
      {:else if error}
        <div class="h-full flex flex-col items-center justify-center text-center p-4">
          <span class="text-destructive text-sm font-medium mb-1">Failed to load release notes</span>
          <span class="text-xs text-muted-foreground mb-4">{error}</span>
          <Button size="xs" variant="outline" onclick={() => window.location.reload()}>
            Try again
          </Button>
        </div>
      {:else if currentRelease}
        <div class="animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="flex items-baseline justify-between mb-4 border-b pb-4">
            <div>
              <h3 class="font-bold text-lg">{currentRelease.name || currentRelease.tag_name}</h3>
              <p class="text-[10px] text-muted-foreground mt-0.5">
                {#if currentRelease.published_at}
                  {@const d = new Date(currentRelease.published_at)}
                  Released on {d.getUTCFullYear()}/{String(d.getUTCMonth() + 1).padStart(2, "0")}/{String(d.getUTCDate()).padStart(2, "0")}
                {:else}
                  Unpublished release
                {/if}
              </p>
            </div>
            <button
              onclick={() => openUrl(currentRelease.html_url).catch(console.error)}
              class="text-[10px] text-[#58a6ff] hover:underline flex items-center gap-1"
            >
              GitHub <ExternalLinkIcon class="w-3 h-3" />
            </button>
          </div>

          <div class="bg-muted/10 rounded-md p-1">
            <SimpleMarkdown content={currentRelease.body ?? ""} />
          </div>

          {#if releases.length >= 1}
            <div class="mt-8 pt-6 border-t border-dashed">
              <p class="text-[10px] text-muted-foreground text-center">
                Looking for older versions? Check the
                <button
                  onclick={() => openUrl("https://github.com/oioi555/quotracker/releases").catch(console.error)}
                  class="text-[#58a6ff] hover:underline"
                >
                  full changelog
                </button>
              </p>
            </div>
          {/if}
        </div>
      {:else}
        <div class="h-full flex flex-col items-center justify-center text-center p-4 opacity-60">
          <span class="text-sm font-medium mb-1">No specific notes for v{currentVersion}</span>
          <span class="text-xs mb-4">This version might be a pre-release or local build.</span>
          <button
            onclick={() => openUrl("https://github.com/oioi555/quotracker/releases").catch(console.error)}
            class="text-xs text-[#58a6ff] hover:underline"
          >
            View all releases on GitHub
          </button>
        </div>
      {/if}
    </div>
  </div>
</div>
