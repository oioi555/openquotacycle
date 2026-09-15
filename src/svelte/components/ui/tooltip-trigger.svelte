<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";

  let {
    children,
    ...rest
  }: TooltipPrimitive.TriggerProps & {
    children?: import("svelte").Snippet;
  } = $props();
</script>

<TooltipPrimitive.Trigger data-slot="tooltip-trigger" {...rest}>
  {@render children?.()}
</TooltipPrimitive.Trigger>
