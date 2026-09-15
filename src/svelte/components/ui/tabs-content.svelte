<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    children,
    ...rest
  }: TabsPrimitive.ContentProps & {
    class?: string;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<TabsPrimitive.Content
  data-slot="tabs-content"
  class={cn("text-sm flex-1 outline-none", className)}
  {...rest}
>
  {@render children?.()}
</TabsPrimitive.Content>
