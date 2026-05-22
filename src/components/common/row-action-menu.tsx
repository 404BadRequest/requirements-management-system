"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Settings2 } from "lucide-react";

export type RowAction = {
  label: string;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
};

/**
 * Gear icon trigger that reveals a compact dropdown of row-level actions.
 * The dropdown is rendered via a portal (appended to <body>) so it is never
 * clipped by table overflow or stacking contexts.
 */
export function RowActionMenu({ items }: { items: RowAction[] }) {
  const [open, setOpen] = useState(false);
  const [coords, setCoords] = useState<{ top: number; right: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const handleOpen = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setCoords({
      top: rect.bottom + 4,
      right: window.innerWidth - rect.right,
    });
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setCoords(null);
    triggerRef.current?.focus();
  };

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleClose();
    };
    const onScroll = () => handleClose();
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [open]);

  if (items.length === 0) return null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={handleOpen}
        title="Acciones"
        className="flex h-7 w-7 items-center justify-center rounded-[2px] border border-border text-muted-foreground transition-colors hover:border-primary/40 hover:bg-muted hover:text-foreground"
      >
        <Settings2 className="h-3.5 w-3.5" aria-hidden />
      </button>

      {open && coords
        ? createPortal(
            <>
              {/* Backdrop */}
              <div className="fixed inset-0 z-[60]" aria-hidden onClick={handleClose} />
              {/* Dropdown panel — fixed so it's never clipped by table overflow */}
              <div
                role="menu"
                style={{ top: coords.top, right: coords.right }}
                className="fixed z-[61] min-w-[9rem] rounded-[2px] border border-border bg-card py-1 shadow-soft"
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
                      handleClose();
                      item.onClick();
                    }}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
