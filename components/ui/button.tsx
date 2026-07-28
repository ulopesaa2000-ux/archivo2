"use client"

import * as React from "react"
import { Button as ButtonPrimitive } from "@base-ui/react/button"
import type { VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { buttonVariants } from "./button-variants"

const Button = React.forwardRef<HTMLButtonElement, ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & { asChild?: boolean }>(({
  asChild,
  className,
  variant = "default",
  size = "default",
  children,
  ...props
}, ref) => {
  return (
    <ButtonPrimitive
      ref={ref}
      render={asChild ? (children as React.ReactElement) : undefined}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
      nativeButton={!asChild}
    >
      {asChild ? undefined : children}
    </ButtonPrimitive>
  )
})
Button.displayName = "Button"

export { Button, buttonVariants }
