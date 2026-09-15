<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    children,
    sideOffset = 6,
    ...rest
  }: DropdownMenuPrimitive.ContentProps & {
    class?: string;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<DropdownMenuPrimitive.Portal>
  <DropdownMenuPrimitive.Content
    {sideOffset}
    class={cn(
      "ui-menu z-50 min-w-36 outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50",
      className,
    )}
    {...rest}
  >
    {@render children?.()}
  </DropdownMenuPrimitive.Content>
</DropdownMenuPrimitive.Portal>
