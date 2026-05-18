"use client";

import { AlertTriangle } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Param leído tras `redirectSettingsError` en `app/settings/actions.ts`. */
const ERROR_PARAM = "settingsError";

export function SettingsFlashBanner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const message = searchParams.get(ERROR_PARAM);

  const dismiss = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete(ERROR_PARAM);
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname);
  }, [pathname, router, searchParams]);

  if (!message) return null;

  return (
    <div
      role="alert"
      className="mb-3 flex items-start gap-3 rounded-[2px] border border-danger/40 bg-danger/[0.08] px-4 py-3 text-sm text-foreground shadow-soft"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
      <p className="min-w-0 flex-1 leading-relaxed">{message}</p>
      <button type="button" className="btn-quiet shrink-0 px-2 py-1 text-xs text-danger hover:bg-danger/10" onClick={() => dismiss()}>
        Cerrar
      </button>
    </div>
  );
}
