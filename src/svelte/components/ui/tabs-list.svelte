<script lang="ts">
  import { Tabs as TabsPrimitive } from "bits-ui";
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "@/lib/utils";

  const tabsListVariants = cva(
    "rounded-md p-0.75 group-data-horizontal/tabs:h-9 data-[variant=line]:rounded-none group/tabs-list text-muted-foreground inline-flex w-fit items-center justify-center group-data-[orientation=vertical]/tabs:h-fit group-data-[orientation=vertical]/tabs:flex-col",
    {
      variants: {
        variant: {
          default: "bg-muted",
          line: "gap-1 bg-transparent",
        },
      },
      defaultVariants: {
        variant: "default",
      },
    },
  );

  let {
    class: className = undefined,
    variant = "default",
    children,
    ...rest
  }: TabsPrimitive.ListProps &
    VariantProps<typeof tabsListVariants> & {
      class?: string;
      children?: import("svelte").Snippet;
    } = $props();
</script>

<TabsPrimitive.List
  data-slot="tabs-list"
  data-variant={variant}
  class={cn(tabsListVariants({ variant }), className)}
  {...rest}
>
  {@render children?.()}
</TabsPrimitive.List>
