<script lang="ts">
  import { tokenizeMarkdown } from "../lib/changelog-markdown";
  import { openUrl } from "../lib/backend";

  let { content }: { content: string } = $props();

  const linkClass =
    "text-[#58a6ff] hover:underline hover:text-[#58a6ff]/80 transition-colors cursor-pointer";

  function tokenUrl(token: { type: string; content: string; url?: string }): string {
    if (token.type === "link") return token.url!;
    if (token.type === "pr")
      return `https://github.com/oioi555/quotracker/pull/${token.content.slice(1)}`;
    if (token.type === "user") return `https://github.com/${token.content.slice(1)}`;
    if (token.type === "commit")
      return `https://github.com/oioi555/quotracker/commit/${token.content}`;
    return "#";
  }
</script>

{#snippet inlineTokens(text: string)}
  {#each tokenizeMarkdown(text) as part}
    {#if part.type === "text"}
      {part.content}
    {:else}
      <button
        type="button"
        class={linkClass + (part.type === "commit" ? " font-mono" : "")}
        onclick={() => openUrl(tokenUrl(part)).catch(console.error)}
      >
        {part.content}
      </button>
    {/if}
  {/each}
{/snippet}

<div class="space-y-1.5 break-words">
  {#each content.split("\n") as line}
    {@const trimmed = line.trim()}
    {#if trimmed === "---" || trimmed === "***" || trimmed === "--"}
      <hr class="border-t border-border/50 my-4" />
    {:else if trimmed.startsWith("###")}
      <h4 class="text-sm font-bold mt-4 mb-1 text-foreground">{@render inlineTokens(trimmed.replace(/^###\s*/, ""))}</h4>
    {:else if trimmed.startsWith("##")}
      <h3 class="text-base font-bold mt-5 mb-2 text-foreground">{@render inlineTokens(trimmed.replace(/^##\s*/, ""))}</h3>
    {:else if (trimmed.startsWith("- ") || trimmed.startsWith("* "))}
      <div class="flex gap-2 pl-1 text-[13px] leading-relaxed">
        <span class="text-muted-foreground/60 mt-1.5 shrink-0 scale-75">•</span>
        <span class="flex-1 text-foreground/90">{@render inlineTokens(trimmed.replace(/^[-*]\s*/, ""))}</span>
      </div>
    {:else if !trimmed}
      <div class="h-1"></div>
    {:else}
      <p class="text-[13px] text-foreground/90 leading-relaxed">{@render inlineTokens(line)}</p>
    {/if}
  {/each}
</div>
