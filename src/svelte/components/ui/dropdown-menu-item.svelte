<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    children,
    ...rest
  }: DropdownMenuPrimitive.ItemProps & {
    class?: string;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<DropdownMenuPrimitive.Item class={cn("ui-menu-item", className)} {...rest}>
  {@render children?.()}
</DropdownMenuPrimitive.Item>
