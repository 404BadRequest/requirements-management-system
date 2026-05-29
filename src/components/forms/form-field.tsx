import type { ReactNode } from "react";

export const FormField = ({
  label,
  hint,
  children,
  error,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  error?: string;
}) => (
  <label className="block space-y-1 text-sm">
    <span className="block font-medium leading-snug">{label}</span>
    {hint ? <span className="block text-[11px] font-normal leading-snug text-muted-foreground">{hint}</span> : null}
    {children}
    {error ? <span className="text-xs text-danger">{error}</span> : null}
  </label>
);
