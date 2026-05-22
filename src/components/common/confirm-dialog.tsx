"use client";

import { useEffect, useRef, useState } from "react";

export const ConfirmDialog = ({
  label,
  title,
  disabled = false,
  triggerClassName = "rounded-[2px] border border-danger px-2 py-1 text-xs text-danger",
  confirmLabel = "Confirmar",
  confirmLoadingLabel = "Procesando...",
  onConfirm,
  open: externalOpen,
  onOpenChange,
}: {
  label: string;
  title: string;
  disabled?: boolean;
  triggerClassName?: string;
  confirmLabel?: string;
  confirmLoadingLabel?: string;
  onConfirm: () => void | Promise<void>;
  /** Controlled mode: when provided the dialog is externally managed. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) => {
  const isControlled = externalOpen !== undefined;
  const [internalOpen, setInternalOpen] = useState(false);
  const open = isControlled ? externalOpen : internalOpen;
  const setOpen = isControlled
    ? (v: boolean) => onOpenChange?.(v)
    : setInternalOpen;
  const [confirming, setConfirming] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setOpen(false);
      }
      if (event.key === "Tab") {
        const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])',
        );
        if (!focusable || focusable.length === 0) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first.focus();
          }
        }
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      {!isControlled ? (
        <button
          className={triggerClassName}
          onClick={() => setOpen(true)}
          type="button"
          disabled={disabled}
        >
          {label}
        </button>
      ) : null}
      {open ? (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="confirm-dialog-title"
        >
          <div ref={dialogRef} className="w-full max-w-sm rounded-[2px] border border-border bg-card p-4 shadow-soft">
            <p id="confirm-dialog-title" className="font-medium">{title}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                ref={cancelRef}
                className="btn-secondary px-3 py-1 text-sm"
                onClick={() => setOpen(false)}
                type="button"
                disabled={confirming}
              >
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
