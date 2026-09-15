<script lang="ts">
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    children,
    ...rest
  }: { class?: string; children?: import("svelte").Snippet; [key: string]: unknown } = $props();
</script>

<h5 class={cn("mb-1 font-medium leading-none tracking-tight", className)} {...rest}>
  {@render children?.()}
</h5>
