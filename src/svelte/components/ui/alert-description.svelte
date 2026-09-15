<script lang="ts">
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    children,
    ...rest
  }: { class?: string; children?: import("svelte").Snippet; [key: string]: unknown } = $props();
</script>

<div class={cn("text-sm [&_p]:leading-relaxed", className)} {...rest}>
  {@render children?.()}
</div>
