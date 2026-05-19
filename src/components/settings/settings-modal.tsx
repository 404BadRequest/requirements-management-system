"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils/cn";

function collectFocusables(root: HTMLElement): HTMLElement[] {
  const sel =
    'button:not([disabled]), [href], input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  return Array.from(root.querySelectorAll<HTMLElement>(sel)).filter((el) => {
    const style = window.getComputedStyle(el);
    if (style.visibility === "hidden" || style.display === "none") return false;
    return el.getClientRects().length > 0;
  });
}

export function SettingsModal({
  open,
  onClose,
  title,
  description,
  children,
  dialogClassName,
  bodyClassName,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  dialogClassName?: string;
  bodyClassName?: string;
}) {
  const titleId = useId();
  const descriptionId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => {
      setMounted(false);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const root = dialogRef.current;
    if (!root) return;

    const previous = document.activeElement as HTMLElement | null;

    const getFocusables = () => collectFocusables(root);
    const focusFirstMeaningful = () => {
      const body = bodyRef.current;
      if (body) {
        const inBody = collectFocusables(body);
        if (inBody.length > 0) {
          inBody[0].focus();
          return;
        }
      }
      getFocusables()[0]?.focus();
    };

    let rafId = 0;
    rafId = requestAnimationFrame(() => {
      focusFirstMeaningful();
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const list = getFocusables();
      if (list.length === 0) return;
      const first = list[0];
      const last = list[list.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (!root.contains(active)) {
        e.preventDefault();
        first.focus();
        return;
      }
      if (e.shiftKey) {
        if (active === first) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("keydown", onKeyDown, true);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open || !mounted) return null;

  const modalNode = (
    <div
      className="fixed inset-0 z-[70] flex items-end justify-center overflow-y-auto bg-foreground/20 p-4 sm:items-center"
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        className={cn(
          "w-full max-w-lg overflow-visible rounded-[2px] border border-border bg-card shadow-soft outline-none",
          dialogClassName,
        )}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-[1] flex items-start justify-between gap-3 border-b border-border bg-card px-5 py-4">
          <div className="min-w-0">
            <h3 id={titleId} className="text-lg font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            className="shrink-0 rounded-[2px] px-2 py-1 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
            onClick={onClose}
            aria-label="Cerrar diálogo"
          >
            ✕
          </button>
        </div>
        <div ref={bodyRef} className={cn("px-5 py-5", bodyClassName)}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalNode, document.body);
}
