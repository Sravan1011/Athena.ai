import * as React from "react"

import { cn } from "@/lib/utils"

function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      data-slot="textarea"
      className={cn(
        "border-2 border-slate-300 placeholder:text-slate-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20 aria-invalid:ring-red-500/20 aria-invalid:border-red-500 flex field-sizing-content min-h-20 w-full rounded-2xl border bg-white/80 backdrop-blur-sm px-4 py-3 text-base shadow-sm transition-all duration-200 outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 hover:bg-white/90 focus:bg-white",
        className
      )}
      {...props}
    />
  )
}

export { Textarea }
