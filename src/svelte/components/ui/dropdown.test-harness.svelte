<script lang="ts">
  import DropdownMenu from "./dropdown-menu.svelte";
  import DropdownMenuTrigger from "./dropdown-menu-trigger.svelte";
  import DropdownMenuContent from "./dropdown-menu-content.svelte";
  import DropdownMenuItem from "./dropdown-menu-item.svelte";

  let { open = $bindable(false) }: { open?: boolean } = $props();
</script>

<DropdownMenu bind:open>
  <DropdownMenuTrigger>open menu</DropdownMenuTrigger>
  <DropdownMenuContent>
    <DropdownMenuItem>menu body</DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
