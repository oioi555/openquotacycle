<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";

  let {
    open = $bindable(false),
    children,
    ...rest
  }: DropdownMenuPrimitive.RootProps & {
    class?: string;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<DropdownMenuPrimitive.Root bind:open {...rest}>
  {@render children?.()}
</DropdownMenuPrimitive.Root>
