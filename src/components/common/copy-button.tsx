"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copiar" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard not available (e.g. non-secure context)
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={label}
      className="rounded px-1 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
    >
      {copied ? "✓" : "⎘"}
    </button>
  );
}
