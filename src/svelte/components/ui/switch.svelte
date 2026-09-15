<script lang="ts">
  import { cn } from "@/lib/utils";

  let {
    class: className = undefined,
    checked = false,
    onCheckedChange,
    ...rest
  }: {
    class?: string;
    checked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    [key: string]: unknown;
  } = $props();
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  onclick={() => onCheckedChange?.(!checked)}
  class={cn(
    "relative h-4 w-7 shrink-0 cursor-pointer rounded-full transition-colors",
    checked ? "bg-meter-fill" : "bg-meter-track",
    className,
  )}
  {...rest}
>
  <span
    aria-hidden="true"
    class={cn(
      "absolute top-0.5 left-0.5 size-3 rounded-full bg-white shadow transition-transform",
      checked && "translate-x-3",
    )}
  ></span>
</button>
