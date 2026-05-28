"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type CollapsibleSection = "plan" | "horas";

const SECTION_LABEL: Record<CollapsibleSection, string> = {
  plan: "Plan de trabajo",
  horas: "Horas",
};

const HASH_SECTION: Record<string, CollapsibleSection | "sidebar"> = {
  "tasks-section": "plan",
  "hours-section": "horas",
  "comments-section": "sidebar",
  "activity-section": "sidebar",
};

function AccordionSection({
  id,
  section,
  label,
  badge,
  open,
  onToggle,
  children,
}: {
  id: string;
  section: CollapsibleSection;
  label: string;
  badge: string | null;
  open: boolean;
  onToggle: (section: CollapsibleSection, next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="overflow-hidden rounded-[2px] border border-border/70 bg-background">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="flex w-full items-center gap-3 px-[length:var(--density-inset-pad)] py-3 text-left transition-colors hover:bg-muted/30"
        onClick={() => onToggle(section, !open)}
      >
        <ChevronDown
          className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
        <span className="min-w-0 flex-1 text-sm font-semibold text-foreground">{label}</span>
        {badge ? (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
            {badge}
          </span>
        ) : null}
      </button>
      {open ? (
        <div id={`${id}-panel`} className="border-t border-border/70 px-[length:var(--density-inset-pad)] py-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

export function RequirementDetailShell({
  sectionCounts,
  summaryContent,
  planContent,
  horasContent,
  sidebarContent,
}: {
  sectionCounts: {
    hours: number;
    tasksDone: number;
    tasksTotal: number;
    comments: number;
  };
  summaryContent: ReactNode;
  planContent: ReactNode;
  horasContent: ReactNode;
  sidebarContent: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [openSections, setOpenSections] = useState<Record<CollapsibleSection, boolean>>({
    plan: false,
    horas: false,
  });

  const clearLegacyTabParam = useCallback(() => {
    if (!searchParams.has("tab")) return;
    const params = new URLSearchParams(searchParams.toString());
    params.delete("tab");
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  const scrollToHash = useCallback((hash: string) => {
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);

  useEffect(() => {
    clearLegacyTabParam();
  }, [clearLegacyTabParam]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) return;

    const mapped = HASH_SECTION[hash];
    if (mapped === "plan" || mapped === "horas") {
      setOpenSections((prev) => ({ ...prev, [mapped]: true }));
      requestAnimationFrame(() => scrollToHash(hash));
      return;
    }
    if (mapped === "sidebar") {
      requestAnimationFrame(() => scrollToHash(hash));
    }
  }, [scrollToHash]);

  const toggleSection = (section: CollapsibleSection, next: boolean) => {
    setOpenSections((prev) => ({ ...prev, [section]: next }));
  };

  const planBadge =
    sectionCounts.tasksTotal > 0 ? `${sectionCounts.tasksDone}/${sectionCounts.tasksTotal}` : null;
  const horasBadge = sectionCounts.hours > 0 ? String(sectionCounts.hours) : null;

  return (
    <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[minmax(0,1fr)_min(22rem,34%)] xl:gap-5">
      <main className="flex min-w-0 flex-col gap-4">
        {summaryContent}

        <AccordionSection
          id="tasks-section"
          section="plan"
          label={SECTION_LABEL.plan}
          badge={planBadge}
          open={openSections.plan}
          onToggle={toggleSection}
        >
          {planContent}
        </AccordionSection>

        <AccordionSection
          id="hours-section"
          section="horas"
          label={SECTION_LABEL.horas}
          badge={horasBadge}
          open={openSections.horas}
          onToggle={toggleSection}
        >
          {horasContent}
        </AccordionSection>
      </main>

      <aside
        className="flex min-w-0 flex-col gap-4 xl:sticky xl:top-3 xl:max-h-[calc(100vh-1.5rem)] xl:overflow-y-auto xl:pr-0.5 [scrollbar-width:thin]"
        aria-label="Comunicación y actividad"
      >
        {sidebarContent}
      </aside>
    </div>
  );
}
