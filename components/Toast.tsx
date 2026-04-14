"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ArrowCounterClockwise, X } from "@phosphor-icons/react";

export type ToastData = {
  id: number;
  message: string;
  undo?: () => void;
};

export function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastData | null;
  onDismiss: () => void;
}) {
  return (
    <AnimatePresence>
      {toast && (
        <motion.div
          key={toast.id}
          initial={{ y: 48, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 48, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 32 }}
          className="pointer-events-none fixed inset-x-0 z-40 flex justify-center px-4"
          style={{
            bottom: "calc(env(safe-area-inset-bottom) + 5.5rem)",
          }}
          role="status"
          aria-live="polite"
        >
          <div className="pointer-events-auto flex items-center gap-3 rounded-full bg-surface-raised px-4 py-2.5 text-sm shadow-lg ring-1 ring-border">
            <span className="text-foreground">{toast.message}</span>
            {toast.undo && (
              <button
                onClick={() => {
                  toast.undo?.();
                  onDismiss();
                }}
                className="inline-flex items-center gap-1 rounded-full bg-foreground px-3 py-1 text-xs font-medium text-background transition hover:opacity-90"
              >
                <ArrowCounterClockwise size={12} weight="bold" />
                Undo
              </button>
            )}
            <button
              onClick={onDismiss}
              className="rounded-full p-1 text-muted transition hover:text-foreground"
              aria-label="Dismiss"
            >
              <X size={14} weight="bold" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
