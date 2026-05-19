"use client";

import { useState } from "react";

export const ConfirmDialog = ({
  label,
  title,
  disabled = false,
  triggerClassName = "rounded-[2px] border border-danger px-2 py-1 text-xs text-danger",
  confirmLabel = "Confirmar",
  confirmLoadingLabel = "Procesando...",
  onConfirm,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  triggerClassName?: string;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  onConfirm: () => void | Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      <button
        className={triggerClassName}
        onClick={() => setOpen(true)}
        type="button"
        disabled={disabled}
      >
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
          <div className="w-full max-w-sm rounded-[2px] border border-border bg-card p-4 shadow-soft">
            <p className="font-medium">{title}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary px-3 py-1 text-sm" onClick={() => setOpen(false)} type="button" disabled={confirming}>
                Cancelar
              </button>
              <button
                className="inline-flex items-center gap-2 rounded-[2px] bg-danger px-3 py-1 text-sm text-white disabled:cursor-not-allowed disabled:opacity-70"
                onClick={async () => {
                  if (confirming) return;
                  setConfirming(true);
                  try {
                    await onConfirm();
                    setOpen(false);
                  } finally {
                    setConfirming(false);
                  }
                }}
                type="button"
                disabled={confirming}
              >
                {confirming ? (
                  <>
                    <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/50 border-t-white" aria-hidden />
                    {confirmLoadingLabel}
                  </>
                ) : (
                  confirmLabel
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
