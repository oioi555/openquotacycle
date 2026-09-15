<script lang="ts">
  import { Checkbox as CheckboxPrimitive } from "bits-ui";
  import CheckIcon from "@lucide/svelte/icons/check";
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    checked = $bindable(false),
    onCheckedChange,
    ...rest
  }: CheckboxPrimitive.RootProps & { class?: string } = $props();
</script>

<CheckboxPrimitive.Root
  data-slot="checkbox"
  bind:checked
  onCheckedChange={onCheckedChange}
  class={cn(
    "border-input dark:bg-input/30 data-checked:bg-primary data-checked:text-primary-foreground dark:data-checked:bg-primary data-checked:border-primary aria-invalid:aria-checked:border-primary aria-invalid:border-destructive dark:aria-invalid:border-destructive/50 focus-visible:border-ring focus-visible:ring-ring/50 aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 flex size-4 items-center justify-center rounded-[4px] border shadow-xs transition-shadow group-has-disabled/field:opacity-50 focus-visible:ring-3 aria-invalid:ring-3 peer relative shrink-0 outline-none after:absolute after:-inset-x-3 after:-inset-y-2 disabled:cursor-not-allowed disabled:opacity-50",
    className,
  )}
  {...rest}
>
  {#if checked}
    <span
      data-slot="checkbox-indicator"
      class="[&>svg]:size-3.5 grid place-content-center text-current transition-none"
    >
      <CheckIcon />
    </span>
  {/if}
</CheckboxPrimitive.Root>
