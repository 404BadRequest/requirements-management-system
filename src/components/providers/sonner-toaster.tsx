"use client";

import { Toaster } from "sonner";

export function SonnerToaster() {
  return (
    <>
      <Toaster richColors position="top-right" closeButton />
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
