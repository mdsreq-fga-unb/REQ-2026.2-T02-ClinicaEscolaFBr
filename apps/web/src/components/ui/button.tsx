import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";

// Botões do protótipo aprovado: principal, contorno, discreto e de exclusão, com
// 44 px de altura nas telas internas e 48 px nas páginas públicas (RNF57).
const buttonVariants = cva(
  "group/button inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border-[1.5px] font-semibold leading-tight whitespace-nowrap no-underline select-none disabled:cursor-not-allowed aria-disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-5",
  {
    variants: {
      variant: {
        default:
          "border-primary bg-primary text-primary-foreground hover:bg-[#00506e] disabled:border-[#c3cfd8] disabled:bg-[#e9eef2] disabled:text-muted-foreground aria-disabled:border-[#c3cfd8] aria-disabled:bg-[#e9eef2] aria-disabled:text-muted-foreground",
        outline:
          "border-primary bg-white text-primary hover:bg-accent disabled:border-[#c3cfd8] disabled:text-muted-foreground",
        ghost:
          "border-transparent bg-transparent px-2.5! text-primary hover:bg-accent",
        destructive:
          "border-destructive bg-destructive text-white hover:bg-[#8f1a10] disabled:opacity-60",
        "destructive-ghost":
          "border-transparent bg-transparent px-2.5! text-destructive hover:bg-erro-fundo",
        link: "min-h-0! border-transparent bg-transparent px-0! text-primary underline underline-offset-2",
      },
      size: {
        default: "min-h-11 px-[18px] text-[15px]",
        lg: "min-h-12 px-[22px] text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
