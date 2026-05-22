"use client";

import { useEffect, useRef, useState } from "react";
import { Settings2 } from "lucide-react";

export type RowAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

/**
 * Gear icon trigger that reveals a compact dropdown of row-level actions.
 * Replaces inline button clusters in data table cells.
 */
export function RowActionMenu({ items }: { items: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        title="Acciones"
        className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-40" aria-hidden onClick={() => setOpen(false)} />
          <div
            role="menu"
            className="absolute right-0 z-50 mt-1 min-w-[9rem] rounded-[2px] border border-border bg-card py-1 shadow-soft"
          >
            {items.map((item) => (
              <button
                key={item.label}
                role="menuitem"
                type="button"
                disabled={item.disabled}
                className={`flex w-full items-center px-3 py-1.5 text-left text-sm transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50 ${
                  item.danger ? "text-danger hover:bg-danger/5" : "text-foreground"
                }`}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
