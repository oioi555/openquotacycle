<script lang="ts">
  import { DropdownMenu as DropdownMenuPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    children,
    ...rest
  }: DropdownMenuPrimitive.TriggerProps & {
    class?: string;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<DropdownMenuPrimitive.Trigger
  class={cn(
    "inline-flex items-center justify-center gap-1 whitespace-nowrap rounded-md text-sm font-medium outline-none transition-all focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-50 select-none",
    className,
  )}
  {...rest}
>
  {@render children?.()}
</DropdownMenuPrimitive.Trigger>
