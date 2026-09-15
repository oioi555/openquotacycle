<script lang="ts">
  import Tooltip from "./tooltip.svelte";
  import TooltipContent from "./tooltip-content.svelte";
  import TooltipTrigger from "./tooltip-trigger.svelte";

  let { open = $bindable(undefined) } = $props();
</script>

<Tooltip open={open}>
  <TooltipTrigger>hover me</TooltipTrigger>
  <TooltipContent>usage detail</TooltipContent>
</Tooltip>
