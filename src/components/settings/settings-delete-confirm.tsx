"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { SettingsModal } from "@/components/settings/settings-modal";
import { scheduleUndoableAction } from "@/components/common/undoable-action";

export function SettingsDeleteConfirm({
  title,
  summary,
  buttonLabel = "Eliminar",
  action,
  pendingMessage = "Elemento marcado para eliminar.",
  successMessage = "Elemento eliminado.",
  errorMessage = "No se pudo eliminar el elemento.",
}: {
  title: string;
  summary?: string;
  buttonLabel?: string;
  /** Server action ya enlazada al id del recurso */
  action: (formData: FormData) => Promise<void>;
  pendingMessage?: string;
  successMessage?: string;
  errorMessage?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  return (
    <>
      <button type="button" className="btn-danger-ghost text-xs" onClick={() => setOpen(true)}>
        {buttonLabel}
      </button>
      <SettingsModal
        open={open}
        onClose={() => {
          if (!pending) setOpen(false);
        }}
        title={title}
        description={summary}
      >
        <form
          className="mt-1 flex flex-wrap justify-end gap-2"
          action={async (fd) => {
            setPending(true);
            try {
              scheduleUndoableAction({
                pendingMessage,
                successMessage,
                errorMessage,
                onCommit: async () => {
                  await action(fd);
                  router.refresh();
                },
              });
              setOpen(false);
            } finally {
              setPending(false);
            }
          }}
        >
          <button type="button" className="btn-secondary px-4 py-2 text-sm" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </button>
          <button
            type="submit"
            className="rounded-[2px] bg-danger px-4 py-2 text-sm font-medium text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={pending}
          >
            {pending ? (
              <span className="inline-flex items-center gap-2">
                <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />
                Eliminando...
              </span>
            ) : (
              "Confirmar eliminación"
            )}
          </button>
        </form>
      </SettingsModal>
    </>
  );
}
