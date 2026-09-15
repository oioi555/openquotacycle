<script lang="ts">
  import { Tooltip as TooltipPrimitive } from "bits-ui";

  let {
    delay = 0,
    open = $bindable(false),
    children,
    ...rest
  }: TooltipPrimitive.ProviderProps & {
    delay?: number;
    open?: boolean;
    children?: import("svelte").Snippet;
  } = $props();
</script>

<TooltipPrimitive.Provider delayDuration={delay} {...rest}>
  <TooltipPrimitive.Root bind:open>
    {@render children?.()}
  </TooltipPrimitive.Root>
</TooltipPrimitive.Provider>
