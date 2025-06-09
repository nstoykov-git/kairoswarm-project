import * as React from "react";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    className={`flex w-full rounded-md border border-gray-300 bg-white p-2 text-sm text-black placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent ${className}`}
    ref={ref}
    {...props}
  />
));
Textarea.displayName = "Textarea";

