import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type = "text", ...props }, ref) => {
    return (
      <input
        ref={ref}
        type={type}
        className={cn(
          /* base */ "flex w-full border bg-background text-sm",
          /* radius */ "rounded-md",
          /* spacing */ "px-3 py-2",
          /* ring */ "ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
          /* disabled */ "disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }


