"use client";

import { toast } from "sonner";

type ScheduleUndoableActionInput = {
  pendingMessage: string;
  successMessage: string;
  errorMessage: string;
  onCommit: () => Promise<void>;
  durationMs?: number;
  deletingMessage?: string;
};

export function scheduleUndoableAction(input: ScheduleUndoableActionInput) {
  const durationMs = input.durationMs ?? 5000;
  let cancelled = false;

  const timer = window.setTimeout(() => {
    void (async () => {
      if (cancelled) return;
      const loadingToastId = toast.loading(input.deletingMessage ?? "Eliminando...", {
        toasterId: "undo-center",
      });
      try {
        await input.onCommit();
        toast.success(input.successMessage, {
          id: loadingToastId,
          toasterId: "undo-center",
        });
      } catch (error) {
        toast.error(error instanceof Error ? error.message : input.errorMessage, {
          id: loadingToastId,
          toasterId: "undo-center",
        });
      }
    })();
  }, durationMs);

  toast.message(input.pendingMessage, {
    toasterId: "undo-center",
    duration: durationMs,
    action: {
      label: "Deshacer",
      onClick: () => {
        cancelled = true;
        window.clearTimeout(timer);
        toast.message("Eliminación cancelada.", { toasterId: "undo-center", duration: 3000 });
      },
    },
  });
}
