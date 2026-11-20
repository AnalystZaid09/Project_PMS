import * as React from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
  className?: string;
}

export const Dialog: React.FC<DialogProps> = ({ open, onOpenChange, children, className }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={() => onOpenChange(false)}
      />
      {/* Content */}
      <div className={cn("relative z-50 w-full max-w-lg rounded-xl bg-white p-6 shadow-2xl transition-all", className)}>
        {children}
      </div>
    </div>
  );
};

export const DialogHeader: React.FC<{
  title?: string;
  description?: string;
  onClose?: () => void;
  children?: React.ReactNode;
}> = ({ title, description, onClose, children }) => {
  if (children) {
    return <div className="pb-4 border-b border-slate-100">{children}</div>;
  }
  return (
    <div className="flex items-start justify-between pb-4 border-b border-slate-100">
      <div>
        {title && <h3 className="text-lg font-semibold text-slate-900">{title}</h3>}
        {description && <p className="text-sm text-slate-500 mt-1">{description}</p>}
      </div>
      {onClose && (
        <button
          onClick={onClose}
          className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>
      )}
    </div>
  );
};

export const DialogFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className,
}) => (
  <div className={cn("mt-6 flex items-center justify-end space-x-3 pt-4 border-t border-slate-100", className)}>
    {children}
  </div>
);
