"use client";

import { useState } from "react";

export const ConfirmDialog = ({
  label,
  title,
  onConfirm,
}: {
  label: string;
  title: string;
  onConfirm: () => void;
}) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        className="rounded-[2px] border border-danger px-2 py-1 text-xs text-danger"
        onClick={() => setOpen(true)}
        type="button"
      >
        {label}
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-foreground/20 p-4">
          <div className="w-full max-w-sm rounded-[2px] border border-border bg-card p-4 shadow-soft">
            <p className="font-medium">{title}</p>
            <div className="mt-4 flex justify-end gap-2">
              <button className="btn-secondary px-3 py-1 text-sm" onClick={() => setOpen(false)} type="button">
                Cancelar
              </button>
              <button
                className="rounded-[2px] bg-danger px-3 py-1 text-sm text-white"
                onClick={() => {
                  onConfirm();
                  setOpen(false);
                }}
                type="button"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
};
