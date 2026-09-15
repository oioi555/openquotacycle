<script lang="ts">
  import type { Snippet } from "svelte";
  import TriangleAlert from "@lucide/svelte/icons/triangle-alert";
  import Alert from "./ui/alert.svelte";

  let { message = "", action }: { message?: string; action?: Snippet } = $props();

  // First sentence = title, rest = detail. Action sits beside copy so height matches Grok.
  const title = $derived(message.match(/^(.*?[.。])\s+([\s\S]+)$/)?.[1] ?? message);
  const detail = $derived(message.match(/^(.*?[.。])\s+([\s\S]+)$/)?.[2] ?? "");
</script>

{#snippet rich(text: string)}
  {#each text.split(/`([^`]+)`/) as part, index}
    {#if index % 2 === 1}
      <code class="rounded bg-muted px-1 font-mono text-[10px] leading-tight">{part}</code>
    {:else}
      {part}
    {/if}
  {/each}
{/snippet}

<Alert variant="warning">
  <span data-slot="notice-icon">
    <TriangleAlert class="size-3" strokeWidth={2} />
  </span>
  <span data-slot="notice-body">
    <span data-slot="notice-copy" class="cursor-text select-text">
      {#if message}
        <strong data-slot="notice-title">{@render rich(title)}</strong>
        {#if detail}
          <small data-slot="notice-detail">{@render rich(detail)}</small>
        {/if}
      {/if}
    </span>
    {#if action}
      <span data-slot="notice-action">{@render action()}</span>
    {/if}
  </span>
</Alert>
