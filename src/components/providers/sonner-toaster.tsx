"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import { Toaster } from "sonner";

export function SonnerToaster() {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const theme = mounted && resolvedTheme === "dark" ? "dark" : "light";

  return (
    <>
      <Toaster richColors position="top-right" closeButton theme={theme} />
      <Toaster
        id="undo-center"
        position="bottom-center"
        closeButton
        toastOptions={{
          className: "border border-border bg-card text-foreground shadow-soft",
        }}
      />
    </>
  );
}
