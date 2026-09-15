<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    orientation = "horizontal",
    value = $bindable(""),
    children,
    ...rest
  }: TabsPrimitive.RootProps & {
    class?: string;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<TabsPrimitive.Root
  data-slot="tabs"
  data-orientation={orientation}
  bind:value
  class={cn("gap-2 group/tabs flex data-[orientation=horizontal]:flex-col", className)}
  {...rest}
>
  {@render children?.()}
</TabsPrimitive.Root>
