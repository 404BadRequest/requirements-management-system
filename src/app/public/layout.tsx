import type { ReactNode } from "react";
import Image from "next/image";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export const metadata = {
  title: "Portal de Cliente · RST",
  robots: "noindex,nofollow",
};

export default function PublicLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border bg-card px-4 py-3 shadow-soft">
        <div className="mx-auto flex max-w-7xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Image
              src="/brand/rst-shield-checkflow-mark.svg"
              alt="Requirement System TI"
              width={32}
              height={32}
              className="h-8 w-8"
            />
            <div className="leading-none">
              <p className="text-sm font-bold uppercase tracking-[0.06em] text-foreground">Requirement System</p>
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-primary">TI</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <span className="rounded-full border border-border bg-muted px-2.5 py-1 text-xs text-muted-foreground">
              Vista de solo lectura
            </span>
          </div>
        </div>
      </header>
      <main id="main-content" className="mx-auto max-w-7xl px-4 py-5 md:px-6">{children}</main>
    </div>
  );
}
