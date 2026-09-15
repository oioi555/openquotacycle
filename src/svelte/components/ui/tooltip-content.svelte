<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    side = "top",
    sideOffset = 4,
    align = "center",
    alignOffset = 0,
    children,
    ...rest
  }: TooltipPrimitive.ContentProps & {
    class?: string;
    side?: "top" | "right" | "bottom" | "left";
    sideOffset?: number;
    align?: "start" | "center" | "end";
    alignOffset?: number;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<TooltipPrimitive.Portal>
  <TooltipPrimitive.Content
    data-slot="tooltip-content"
    {side}
    {sideOffset}
    {align}
    {alignOffset}
    class={cn(
      "data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 rounded-md px-3 py-1.5 text-xs bg-popover text-popover-foreground border border-border shadow-md z-50 w-fit max-w-xs origin-(--transform-origin)",
      className,
    )}
    {...rest}
  >
    {@render children?.()}
    <TooltipPrimitive.Arrow class="fill-popover z-50 size-2.5" />
  </TooltipPrimitive.Content>
</TooltipPrimitive.Portal>
