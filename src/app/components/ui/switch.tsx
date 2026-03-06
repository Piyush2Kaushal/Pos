"use client";

import * as React from "react";
import * as SwitchPrimitives from "@radix-ui/react-switch";
import { cn } from "@/app/components/ui/utils";

const Switch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root
    className={cn(
      // Layout & shape
      "peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent",
      // Transitions
      "transition-colors duration-200 ease-in-out",
      // Focus ring (keyboard accessibility — unchanged)
      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
      // Disabled
      "disabled:cursor-not-allowed disabled:opacity-50",
      // ✅ FIX: was `data-[state=unchecked]:bg-input`
      //    --input resolves to ~#e2e8f0 (near-white) — invisible on light backgrounds.
      //    slate-400 (#94a3b8) gives clear contrast in OFF state on any light surface.
      "data-[state=checked]:bg-primary data-[state=unchecked]:bg-slate-400",
      className
    )}
    {...props}
    ref={ref}
  >
    <SwitchPrimitives.Thumb
      className={cn(
        "pointer-events-none block h-5 w-5 rounded-full bg-white",
        // shadow-md (was shadow-lg) — thumb still pops cleanly on the darker OFF track
        "shadow-md ring-0",
        "transition-transform duration-200 ease-in-out",
        "data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0"
      )}
    />
  </SwitchPrimitives.Root>
));

Switch.displayName = SwitchPrimitives.Root.displayName;

export { Switch };