import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingSpinner: React.FC<{ message?: string; size?: "sm" | "md" | "lg" | string }> = ({
  message = "Loading data...",
  size = "md",
}) => {
  const iconSizeClass = size === "sm" ? "h-5 w-5" : size === "lg" ? "h-10 w-10" : "h-8 w-8";

  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
      <Loader2 className={`${iconSizeClass} animate-spin text-blue-600`} />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
