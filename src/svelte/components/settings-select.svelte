<script lang="ts" generics="T">
  import Check from "@lucide/svelte/icons/check";
  import ChevronDown from "@lucide/svelte/icons/chevron-down";
  import DropdownMenu from "./ui/dropdown-menu.svelte";
  import DropdownMenuTrigger from "./ui/dropdown-menu-trigger.svelte";
  import DropdownMenuContent from "./ui/dropdown-menu-content.svelte";
  import DropdownMenuItem from "./ui/dropdown-menu-item.svelte";

  let {
    value,
    options,
    ariaLabel,
    onChange,
  }: {
    value: T;
    options: { value: T; label: string }[];
    ariaLabel: string;
    onChange: (value: T) => void;
  } = $props();

  const currentLabel = $derived(options.find((option) => option.value === value)?.label ?? "");
</script>

<DropdownMenu>
  <DropdownMenuTrigger
    aria-label={ariaLabel}
    class="ui-pressable h-8 max-w-[11rem] shrink-0 justify-between gap-1.5 rounded-md border border-input bg-background px-2.5 text-sm font-normal text-foreground"
  >
    <span class="truncate">{currentLabel}</span>
    <ChevronDown class="size-3.5 shrink-0 text-muted-foreground" />
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" class="min-w-36">
    {#each options as option (String(option.value))}
      <DropdownMenuItem
        onclick={() => {
          onChange(option.value);
        }}
      >
        {#if option.value === value}
          <Check />
        {:else}
          <span class="size-4 shrink-0" aria-hidden="true"></span>
        {/if}
        {option.label}
      </DropdownMenuItem>
    {/each}
  </DropdownMenuContent>
</DropdownMenu>
