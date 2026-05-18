"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

function isInternalNavigationTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) return false;
  const anchor = target.closest("a[href]");
  if (!anchor) return false;
  const href = anchor.getAttribute("href");
  if (!href) return false;
  if (href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) return false;
  if (anchor.getAttribute("target") === "_blank") return false;
  if (anchor.hasAttribute("download")) return false;
  return true;
}

export function RouteProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = useMemo(() => `${pathname}?${searchParams.toString()}`, [pathname, searchParams]);

  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFinishing, setIsFinishing] = useState(false);
  const mountedRef = useRef(false);
  const finishTimerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (!visible) return;
    setIsFinishing(true);
    setProgress(100);
    if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
    finishTimerRef.current = window.setTimeout(() => {
      setVisible(false);
      setIsFinishing(false);
      setProgress(0);
    }, 220);
    return () => {
      if (finishTimerRef.current) window.clearTimeout(finishTimerRef.current);
    };
  }, [routeKey, visible]);

  useEffect(() => {
    if (!visible || isFinishing) return;
    const id = window.setInterval(() => {
      setProgress((current) => (current >= 88 ? current : current + Math.max(1, (90 - current) * 0.08)));
    }, 120);
    return () => window.clearInterval(id);
  }, [visible, isFinishing]);

  useEffect(() => {
    const startProgress = () => {
      if (finishTimerRef.current) {
        window.clearTimeout(finishTimerRef.current);
        finishTimerRef.current = null;
      }
      setIsFinishing(false);
      setVisible(true);
      setProgress((current) => (current > 8 ? current : 12));
    };

    const handleClick = (event: MouseEvent) => {
      if (!isInternalNavigationTarget(event.target)) return;
      startProgress();
    };

    const handleSubmit = (event: Event) => {
      if (!(event.target instanceof HTMLFormElement)) return;
      startProgress();
    };

    window.addEventListener("click", handleClick, true);
    window.addEventListener("submit", handleSubmit, true);
    return () => {
      window.removeEventListener("click", handleClick, true);
      window.removeEventListener("submit", handleSubmit, true);
    };
  }, []);

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[70] h-0.5 bg-transparent"
      aria-hidden
      style={{ opacity: visible ? 1 : 0, transition: "opacity 180ms ease" }}
    >
      <div
        className="h-full bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.65)]"
        style={{ width: `${progress}%`, transition: isFinishing ? "width 180ms ease-out" : "width 140ms ease-out" }}
      />
    </div>
  );
}
