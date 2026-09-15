<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    ...rest
  }: DropdownMenuPrimitive.SeparatorProps & { class?: string } = $props();
</script>

<DropdownMenuPrimitive.Separator class={cn("ui-menu-separator", className)} {...rest} />
