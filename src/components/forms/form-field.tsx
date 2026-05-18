import type { ReactNode } from "react";

export const FormField = ({ label, children, error }: { label: string; children: ReactNode; error?: string }) => (
  <label className="block space-y-1 text-sm">
    <span className="font-medium">{label}</span>
    {children}
    {error ? <span className="text-xs text-danger">{error}</span> : null}
  </label>
);
