"use client";

import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils/cn";

export type RequirementDetailTab = "resumen" | "plan" | "horas" | "comunicacion";

const TAB_ORDER: RequirementDetailTab[] = ["resumen", "plan", "horas", "comunicacion"];

const TAB_LABEL: Record<RequirementDetailTab, string> = {
  resumen: "Resumen",
  plan: "Plan de trabajo",
  horas: "Horas",
  comunicacion: "Comunicación",
};

const HASH_TAB: Record<string, RequirementDetailTab> = {
  "hours-section": "horas",
  "tasks-section": "plan",
  "comments-section": "comunicacion",
  "activity-section": "comunicacion",
};

function parseTab(value: string | null): RequirementDetailTab {
  if (value === "plan" || value === "horas" || value === "comunicacion") return value;
  return "resumen";
}

export function RequirementDetailShell({
  tabCounts,
  resumenContent,
  planContent,
  horasContent,
  comunicacionContent,
}: {
  tabCounts: {
    hours: number;
    tasksDone: number;
    tasksTotal: number;
    comments: number;
  };
  resumenContent: ReactNode;
  planContent: ReactNode;
  horasContent: ReactNode;
  comunicacionContent: ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<RequirementDetailTab>(() => parseTab(searchParams.get("tab")));

  const syncTabToUrl = useCallback(
    (tab: RequirementDetailTab) => {
      const params = new URLSearchParams(searchParams.toString());
      if (tab === "resumen") {
        params.delete("tab");
      } else {
        params.set("tab", tab);
      }
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  useEffect(() => {
    const tabFromQuery = parseTab(searchParams.get("tab"));
    const hash = typeof window !== "undefined" ? window.location.hash.replace(/^#/, "") : "";
    const tabFromHash = hash ? HASH_TAB[hash] : undefined;
    const nextTab = tabFromHash ?? tabFromQuery;
    setActiveTab(nextTab);
    if (tabFromHash && tabFromHash !== tabFromQuery) {
      syncTabToUrl(tabFromHash);
    }
  }, [searchParams, syncTabToUrl]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const hash = window.location.hash.replace(/^#/, "");
    if (!hash) return;
    const target = document.getElementById(hash);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [activeTab]);

  const selectTab = (tab: RequirementDetailTab) => {
    setActiveTab(tab);
    syncTabToUrl(tab);
  };

  const tabBadge = useMemo(
    () =>
      ({
        resumen: null,
        plan: tabCounts.tasksTotal > 0 ? `${tabCounts.tasksDone}/${tabCounts.tasksTotal}` : null,
        horas: tabCounts.hours > 0 ? String(tabCounts.hours) : null,
        comunicacion: tabCounts.comments > 0 ? String(tabCounts.comments) : null,
      }) satisfies Record<RequirementDetailTab, string | null>,
    [tabCounts],
  );

  const panelContent: Record<RequirementDetailTab, ReactNode> = {
    resumen: resumenContent,
    plan: planContent,
    horas: horasContent,
    comunicacion: comunicacionContent,
  };

  return (
    <div className="flex flex-col gap-4">
      <nav
        aria-label="Secciones del requerimiento"
        className="sticky top-0 z-10 -mx-1 border-b border-border bg-background/95 px-1 pb-0 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      >
        <div className="flex gap-1 overflow-x-auto [scrollbar-width:thin]">
          {TAB_ORDER.map((tab) => {
            const active = activeTab === tab;
            const badge = tabBadge[tab];
            return (
              <button
                key={tab}
                type="button"
                role="tab"
                aria-selected={active}
                aria-controls={`requirement-tab-${tab}`}
                id={`requirement-tab-trigger-${tab}`}
                className={cn(
                  "shrink-0 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:border-border hover:text-foreground",
                )}
                onClick={() => selectTab(tab)}
              >
                {TAB_LABEL[tab]}
                {badge ? (
                  <span
                    className={cn(
                      "ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
                      active ? "bg-primary/15 text-primary" : "bg-muted text-muted-foreground",
                    )}
                  >
                    {badge}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </nav>

      <div
        id={`requirement-tab-${activeTab}`}
        role="tabpanel"
        aria-labelledby={`requirement-tab-trigger-${activeTab}`}
      >
        {panelContent[activeTab]}
      </div>
    </div>
  );
}
