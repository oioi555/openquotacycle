<script lang="ts">
  import { Separator as SeparatorPrimitive } from "bits-ui";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    orientation = "horizontal",
    ...rest
  }: SeparatorPrimitive.RootProps & { class?: string } = $props();
</script>

<SeparatorPrimitive.Root
  data-slot="separator"
  {orientation}
  class={cn(
    "bg-border shrink-0 data-[orientation=horizontal]:h-px data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px data-[orientation=vertical]:self-stretch",
    className,
  )}
  {...rest}
/>
