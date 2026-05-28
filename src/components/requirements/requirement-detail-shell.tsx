"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronDown, Clock, ListTodo, MessageSquare } from "lucide-react";
import { cn } from "@/lib/utils/cn";

type AccordionSectionKey = "horas" | "chat";

const HASH_SECTION: Record<string, AccordionSectionKey | "plan"> = {
  "tasks-section": "plan",
  "hours-section": "horas",
  "comments-section": "chat",
};

export type RequirementDetailShellProps = {
  sectionCounts: {
    hours: number;
    tasksDone: number;
    tasksTotal: number;
    comments: number;
  };
  summaryContent: ReactNode;
  planContent: ReactNode;
  horasContent: ReactNode;
  chatContent: ReactNode;
};

function buildBadges(counts: RequirementDetailShellProps["sectionCounts"]) {
  return {
    plan: counts.tasksTotal > 0 ? `${counts.tasksDone}/${counts.tasksTotal}` : null,
    horas: counts.hours > 0 ? String(counts.hours) : null,
    comments: counts.comments > 0 ? String(counts.comments) : null,
  };
}

function DetailAccordionSection({
  id,
  section,
  label,
  icon: Icon,
  badge,
  hint,
  open,
  onToggle,
  children,
}: {
  id: string;
  section: AccordionSectionKey;
  label: string;
  icon: typeof Clock;
  badge: string | null;
  hint: string | null;
  open: boolean;
  onToggle: (section: AccordionSectionKey, next: boolean) => void;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-4 overflow-hidden rounded-[2px] border border-border/70 bg-background">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={`${id}-panel`}
        className="flex w-full items-start gap-3 px-[length:var(--density-inset-pad)] py-3.5 text-left transition-colors hover:bg-muted/30"
        onClick={() => onToggle(section, !open)}
      >
        <ChevronDown
          className={cn("mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")}
          aria-hidden
        />
        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" aria-hidden />
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-foreground">{label}</span>
            {badge ? (
              <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold tabular-nums text-muted-foreground">
                {badge}
              </span>
            ) : null}
          </span>
          {!open && hint ? <span className="mt-0.5 block text-[11px] text-muted-foreground">{hint}</span> : null}
        </span>
      </button>
      {open ? (
        <div id={`${id}-panel`} className="border-t border-border/70 px-[length:var(--density-inset-pad)] py-4">
          {children}
        </div>
      ) : null}
    </section>
  );
}

function SectionQuickNav({
  badges,
  planHint,
  horasHint,
  chatHint,
  onScrollToPlan,
  onOpenSection,
}: {
  badges: ReturnType<typeof buildBadges>;
  planHint: string;
  horasHint: string;
  chatHint: string;
  onScrollToPlan: () => void;
  onOpenSection: (section: AccordionSectionKey) => void;
}) {
  return (
    <nav
      aria-label="Accesos rápidos a secciones"
      className="flex flex-wrap gap-2 rounded-[2px] border border-border/60 bg-muted/15 p-2"
    >
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs xl:hidden"
        onClick={onScrollToPlan}
      >
        <ListTodo className="h-3.5 w-3.5" aria-hidden />
        Plan{badges.plan ? ` · ${badges.plan}` : ""}
      </button>
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
        onClick={() => onOpenSection("horas")}
      >
        <Clock className="h-3.5 w-3.5" aria-hidden />
        Horas{badges.horas ? ` · ${badges.horas}` : ""}
      </button>
      <button
        type="button"
        className="btn-secondary inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs"
        onClick={() => onOpenSection("chat")}
      >
        <MessageSquare className="h-3.5 w-3.5" aria-hidden />
        Observaciones{badges.comments ? ` · ${badges.comments}` : ""}
      </button>
      <span className="hidden w-full text-[10px] text-muted-foreground xl:block">
        {planHint} · {horasHint} · {chatHint}
      </span>
    </nav>
  );
}

export function RequirementDetailShell({
  sectionCounts,
  summaryContent,
  planContent,
  horasContent,
  chatContent,
}: RequirementDetailShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const badges = buildBadges(sectionCounts);

  const [openSections, setOpenSections] = useState<Record<AccordionSectionKey, boolean>>({
    horas: false,
    chat: false,
  });

  const planHint =
    sectionCounts.tasksTotal > 0
      ? `${sectionCounts.tasksTotal} tarea(s) · ${sectionCounts.tasksDone} completada(s)`
      : "Sin tareas definidas";
  const horasHint =
    sectionCounts.hours > 0
      ? `${sectionCounts.hours} registro(s) de horas`
      : "Sin horas imputadas aún";
  const chatHint =
    sectionCounts.comments > 0
      ? `${sectionCounts.comments} mensaje(s) en el hilo`
      : "Sin mensajes — expande para escribir";

  const scrollToHash = useCallback((hash: string) => {
    if (!hash) return;
    document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const scrollToPlan = useCallback(() => {
    requestAnimationFrame(() => scrollToHash("tasks-section"));
  }, [scrollToHash]);

  const openSection = useCallback(
    (section: AccordionSectionKey) => {
      setOpenSections((prev) => ({ ...prev, [section]: true }));
      const hash = section === "horas" ? "hours-section" : "comments-section";
      requestAnimationFrame(() => scrollToHash(hash));
    },
    [scrollToHash],
  );

  const toggleSection = (section: AccordionSectionKey, next: boolean) => {
    setOpenSections((prev) => ({ ...prev, [section]: next }));
  };

  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    let changed = false;
    for (const key of ["layout", "compare", "tab"] as const) {
      if (params.has(key)) {
        params.delete(key);
        changed = true;
      }
    }
    if (!changed) return;
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [pathname, router, searchParams]);

  useEffect(() => {
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    if (!hash) return;

    const mapped = HASH_SECTION[hash];
    if (mapped === "horas" || mapped === "chat") {
      setOpenSections((prev) => ({ ...prev, [mapped]: true }));
      requestAnimationFrame(() => scrollToHash(hash));
      return;
    }
    if (mapped === "plan") {
      requestAnimationFrame(() => scrollToHash(hash));
    }
  }, [scrollToHash]);

  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(26rem,40%)] xl:items-stretch xl:gap-8">
      <main className="flex min-w-0 flex-col gap-4">
        {summaryContent}
        <SectionQuickNav
          badges={badges}
          planHint={planHint}
          horasHint={horasHint}
          chatHint={chatHint}
          onScrollToPlan={scrollToPlan}
          onOpenSection={openSection}
        />
        <DetailAccordionSection
          id="hours-section"
          section="horas"
          label="Horas registradas"
          icon={Clock}
          badge={badges.horas}
          hint={horasHint}
          open={openSections.horas}
          onToggle={toggleSection}
        >
          {horasContent}
        </DetailAccordionSection>
        <DetailAccordionSection
          id="comments-section"
          section="chat"
          label="Observaciones y dudas"
          icon={MessageSquare}
          badge={badges.comments}
          hint={chatHint}
          open={openSections.chat}
          onToggle={toggleSection}
        >
          {chatContent}
        </DetailAccordionSection>
      </main>

      <aside className="flex min-h-0 min-w-0 flex-col xl:sticky xl:top-3 xl:self-start">
        <section
          id="tasks-section"
          className="surface-card scroll-mt-4 flex min-h-[20rem] flex-col overflow-hidden xl:h-full xl:min-h-0"
        >
          <div className="shrink-0 border-b border-border/60 px-4 py-3.5">
            <h2 className="text-sm font-semibold tracking-tight text-foreground">Plan de trabajo</h2>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
              {planHint}
              {badges.plan ? ` · ${badges.plan}` : ""}
            </p>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 [scrollbar-width:thin]">{planContent}</div>
        </section>
      </aside>
    </div>
  );
}
