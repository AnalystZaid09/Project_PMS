import React from "react";
import { Loader2 } from "lucide-react";

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = "Loading data..." }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-slate-500 space-y-3">
      <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      <span className="text-sm font-medium">{message}</span>
    </div>
  );
};
