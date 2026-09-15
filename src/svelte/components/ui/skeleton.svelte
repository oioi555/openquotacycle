<script lang="ts">
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    ...rest
  }: { class?: string; [key: string]: unknown } = $props();
</script>

<div class={cn("animate-pulse rounded-md bg-muted", className)} {...rest}></div>
