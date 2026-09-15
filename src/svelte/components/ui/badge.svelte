<script lang="ts">
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "@/lib/utils";

  const badgeVariants = cva(
    "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
    {
      variants: {
        variant: {
          default: "border-transparent bg-primary text-primary-foreground",
          secondary: "border-transparent bg-secondary text-secondary-foreground",
          outline: "text-foreground",
        },
      },
      defaultVariants: {
        variant: "secondary",
      },
    },
  );

  let {
    class: className = undefined,
    variant,
    children,
    ...rest
  }: VariantProps<typeof badgeVariants> & {
    class?: string;
    children?: import("svelte").Snippet;
    [key: string]: unknown;
  } = $props();
</script>

<span class={cn(badgeVariants({ variant }), className)} {...rest}>
  {@render children?.()}
</span>
