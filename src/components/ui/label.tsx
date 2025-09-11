import * as React from "react"

import { cn } from "@/lib/utils"

function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label
      className={cn(
        /* base */ "text-sm font-medium leading-none",
        /* color */ "text-foreground",
        className
      )}
      {...props}
    />
  )
}

export { Label }


