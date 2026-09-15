<script lang="ts">
  import { cva, type VariantProps } from "class-variance-authority";
  import { cn } from "@/lib/utils";

  const alertVariants = cva("relative w-full", {
    variants: {
      variant: {
        default:
          "rounded-md border bg-background p-4 text-foreground [&>svg~*]:pl-7 [&>svg+div]:-translate-y-0.75 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-foreground",
        destructive:
          "rounded-md border border-destructive/50 p-4 text-destructive dark:border-destructive [&>svg~*]:pl-7 [&>svg+div]:-translate-y-0.75 [&>svg]:absolute [&>svg]:left-4 [&>svg]:top-4 [&>svg]:text-destructive",
        warning: "ui-notice",
      },
    },
      defaultVariants: {
        variant: "default",
      },
    },
  );

  let {
    class: className = undefined,
    variant,
    children,
    ...rest
  }: VariantProps<typeof alertVariants> & {
    class?: string;
    children?: import("svelte").Snippet;
    [key: string]: unknown;
  } = $props();
</script>

<div role="alert" class={cn(alertVariants({ variant }), className)} {...rest}>
  {@render children?.()}
</div>
