"use client";

import { useState, useEffect, useCallback } from "react";
import { useEventListener } from "@liveblocks/react/suspense";
import { AlertTriangle } from "lucide-react";

interface Toast {
  id: string;
  message: string;
  createdAt: number;
}

const TOAST_DURATION = 6000;
const MAX_VISIBLE = 4;

/**
 * Renders false breadcrumb messages as system-warning-style toasts.
 *
 * Listens for "breadcrumb" broadcast events from the ghost's abilities.
 * Messages appear as terminal-style warnings at the bottom of the editor,
 * looking identical to real system output. They fade out after 6 seconds.
 */
export function BreadcrumbToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  // Listen for breadcrumb events
  useEventListener(({ event }) => {
    if (event.type !== "breadcrumb") return;

    const toast: Toast = {
      id: `bc-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      message: event.message,
      createdAt: Date.now(),
    };

    setToasts((prev) => [...prev.slice(-(MAX_VISIBLE - 1)), toast]);
  });

  // Auto-remove expired toasts
  useEffect(() => {
    if (toasts.length === 0) return;

    const interval = setInterval(() => {
      const now = Date.now();
      setToasts((prev) =>
        prev.filter((t) => now - t.createdAt < TOAST_DURATION),
      );
    }, 500);

    return () => clearInterval(interval);
  }, [toasts.length]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 flex flex-col gap-1.5 max-w-md pointer-events-none">
      {toasts.map((toast) => {
        const age = Date.now() - toast.createdAt;
        const fadeStart = TOAST_DURATION - 1500;
        const opacity =
          age > fadeStart ? Math.max(0, 1 - (age - fadeStart) / 1500) : 1;

        return (
          <div
            key={toast.id}
            className="flex items-start gap-2 px-4 py-2.5 bg-surface-raised border border-warning/20 rounded-lg transition-opacity animate-fade-in"
            style={{ opacity }}
          >
            <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
            <span className="text-sm text-text-secondary leading-relaxed">
              {toast.message}
            </span>
          </div>
        );
      })}
    </div>
  );
}
