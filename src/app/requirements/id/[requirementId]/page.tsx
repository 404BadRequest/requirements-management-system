import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import {
  getCatalogByKind,
  getClients,
  getRequirementById,
  getRequirementComments,
  getRequirementStatusHistory,
  getTimeEntries,
  getUsers,
  getProfiles,
} from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { formatStatusLabel } from "@/lib/formatting/status-label";
import { RequirementHoursPanel } from "@/components/requirements/requirement-hours-panel";
import { RequirementObservationsChat } from "@/components/requirements/requirement-observations-chat";
import {
  RequirementActivityTimeline,
  type RequirementActivityEvent,
} from "@/components/requirements/requirement-activity-timeline";
import { RequirementOwnerReassign } from "@/components/requirements/requirement-owner-reassign";
import { RequirementEditModal } from "@/components/requirements/requirement-edit-modal";
import type { Profile, SettingsCatalogEntry, TimeEntry, User } from "@/types/domain";

function catalogLabel(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.active && e.code === code);
  return entry?.label ?? code;
}

function requirementStatusLabel(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.active && e.code === code);
  return formatStatusLabel(code, entry?.label ?? code);
}

function minutesToHoursDisplay(minutes: number): string {
  return `${(minutes / 60).toFixed(1)} h`;
}

function buildHoursBreakdown(
  entries: TimeEntry[],
  userById: Map<string, User>,
  profileById: Map<string, Profile>,
  categoryLabel: (code: string) => string,
): { byProfile: { label: string; hoursDisplay: string; minutes: number }[]; byCategory: { label: string; hoursDisplay: string; minutes: number }[] } {
  const profileMinutes = new Map<string, number>();
  const categoryMinutes = new Map<string, number>();

  for (const e of entries) {
    const user = userById.get(e.userId);
    const profile = user ? profileById.get(user.profileId) : undefined;
    const profileLabel = profile?.name ?? "Sin perfil";
    profileMinutes.set(profileLabel, (profileMinutes.get(profileLabel) ?? 0) + e.durationMinutes);

    const cat = categoryLabel(e.category);
    categoryMinutes.set(cat, (categoryMinutes.get(cat) ?? 0) + e.durationMinutes);
  }

  const byProfile = [...profileMinutes.entries()]
    .map(([label, minutes]) => ({ label, minutes, hoursDisplay: minutesToHoursDisplay(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);

  const byCategory = [...categoryMinutes.entries()]
    .map(([label, minutes]) => ({ label, minutes, hoursDisplay: minutesToHoursDisplay(minutes) }))
    .sort((a, b) => b.minutes - a.minutes);

  return { byProfile, byCategory };
}

export default async function RequirementDetailPage({ params }: { params: Promise<{ requirementId: string }> }) {
  const sessionUser = await requirePermission("requirements.read");
  const { requirementId } = await params;
  const [
    requirement,
    comments,
    history,
    entries,
    clients,
    users,
    profiles,
    timeCategories,
    requirementStatuses,
    requirementPriorities,
  ] = await Promise.all([
    getRequirementById(requirementId),
    getRequirementComments(requirementId),
    getRequirementStatusHistory(requirementId),
    getTimeEntries(),
    getClients(),
    getUsers(),
    getProfiles(),
    getCatalogByKind("time_entry_category"),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
  ]);

  if (!requirement) {
    notFound();
  }

  const requirementEntries = entries.filter((entry) => entry.requirementId === requirementId);
  const clientName = clients.find((c) => c.id === requirement.clientId)?.name ?? requirement.clientId;
  const userById = new Map(users.map((u) => [u.id, u]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const catLabel = (code: string) => catalogLabel(timeCategories, code);

  const totalMinutes = requirementEntries.reduce((acc, item) => acc + item.durationMinutes, 0);
  const { byProfile, byCategory } = buildHoursBreakdown(requirementEntries, userById, profileById, catLabel);

  const hourRows = [...requirementEntries]
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      if (d !== 0) return d;
      return b.startTime.localeCompare(a.startTime);
    })
    .map((e) => {
      const user = userById.get(e.userId);
      const profile = user ? profileById.get(user.profileId) : undefined;
      return {
        id: e.id,
        date: e.date,
        userName: user?.name ?? e.userId,
        profileName: profile?.name ?? "—",
        categoryLabel: catLabel(e.category),
        durationDisplay: minutesToHoursDisplay(e.durationMinutes),
        timeRange: `${e.startTime}–${e.endTime}`,
        taskDescription: e.taskDescription,
      };
    });

  const statusLabel = requirementStatusLabel(requirementStatuses, requirement.status);
  const priorityLabel = catalogLabel(requirementPriorities, requirement.priority);

  const currentDirectoryUserId = resolveDirectoryUserIdForSession(sessionUser, users);
  const canPostObservations = roleHasPermission(sessionUser.role, "requirements.write");
  const canReassignOwner = sessionUser.role === "Admin" || sessionUser.role === "Project Manager";
  const canManageRequirement = canReassignOwner;
  const observationMessages = comments.map((comment) => ({
    id: comment.id,
    body: comment.body,
    createdAt: comment.createdAt,
    authorId: comment.userId,
    authorName: userById.get(comment.userId)?.name ?? comment.userId,
    isOwn: comment.userId === currentDirectoryUserId,
  }));

  const activityEvents: RequirementActivityEvent[] = [
    ...history.map((event) => ({
      id: `status-${event.id}`,
      type: "status" as const,
      title: `${requirementStatusLabel(requirementStatuses, event.fromStatus)} → ${requirementStatusLabel(requirementStatuses, event.toStatus)}`,
      description: `Cambio realizado por ${userById.get(event.changedById)?.name ?? event.changedById}.`,
      at: event.changedAt,
      href: "#status-history-section",
    })),
    ...comments.map((comment) => ({
      id: `comment-${comment.id}`,
      type: "comment" as const,
      title: "Nuevo comentario",
      description: `${userById.get(comment.userId)?.name ?? comment.userId}: ${comment.body.slice(0, 120)}${comment.body.length > 120 ? "…" : ""}`,
      at: comment.createdAt,
      href: "#comments-section",
    })),
    ...requirementEntries.map((entry) => ({
      id: `time-${entry.id}`,
      type: "time" as const,
      title: "Imputación de horas",
      description: `${userById.get(entry.userId)?.name ?? entry.userId} registró ${minutesToHoursDisplay(entry.durationMinutes)} en ${catLabel(entry.category)}.`,
      at: `${entry.date}T${entry.startTime}:00`,
      href: "#hours-section",
    })),
  ].sort((a, b) => {
    const ad = new Date(a.at).getTime();
    const bd = new Date(b.at).getTime();
    return bd - ad;
  });

  return (
    <AppShell>
      <PageHeader
        title={requirement.title}
        description={requirement.description}
        actions={
          <RequirementEditModal
            requirement={requirement}
            clients={clients.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }))}
            statusOptions={requirementStatuses.filter((s) => s.active).map((s) => ({ code: s.code, label: s.label }))}
            priorityOptions={requirementPriorities.filter((p) => p.active).map((p) => ({ code: p.code, label: p.label }))}
            owners={users.map((u) => ({ id: u.id, name: u.name }))}
            canManageRequirement={canManageRequirement}
            triggerLabel="Editar requerimiento"
            triggerClassName="btn-secondary py-2 text-sm"
          />
        }
      />
      <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
          <p className="mt-2 text-xl font-semibold text-foreground">{clientName}</p>
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Responsable</h3>
          <RequirementOwnerReassign
            requirementId={requirement.id}
            requirementTitle={requirement.title}
            currentOwnerId={requirement.ownerId}
            owners={users.map((u) => ({ id: u.id, name: u.name }))}
            canWrite={canReassignOwner}
          />
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Estado</h3>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{statusLabel}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{requirement.status}</p>
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Prioridad</h3>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{priorityLabel}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{requirement.priority}</p>
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Horas imputadas (total)</h3>
          <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{minutesToHoursDisplay(totalMinutes)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{requirementEntries.length} registro(s)</p>
        </article>
      </section>

      <RequirementActivityTimeline events={activityEvents} />

      <section id="hours-section">
        <RequirementHoursPanel
          rows={hourRows}
          byProfile={byProfile.map(({ label, hoursDisplay }) => ({ label, hoursDisplay }))}
          byCategory={byCategory.map(({ label, hoursDisplay }) => ({ label, hoursDisplay }))}
          totalHoursDisplay={minutesToHoursDisplay(totalMinutes)}
          imputationCount={requirementEntries.length}
        />
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div id="comments-section" className="min-h-0 lg:col-span-3">
          <RequirementObservationsChat
            requirementId={requirementId}
            messages={observationMessages}
            canPost={canPostObservations}
          />
        </div>
        <details id="status-history-section" className="surface-card p-4 lg:col-span-2">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3">
            <h3 className="font-medium text-foreground">Historial de estado</h3>
            <span className="rounded-[2px] border border-border bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
              {history.length} evento{history.length === 1 ? "" : "s"}
            </span>
          </summary>
          {history.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">Sin cambios de estado registrados.</p>
          ) : (
            <ol className="relative mt-3 ml-1 border-l border-border/70 pl-4 text-sm">
              {history.map((event) => (
                <li key={event.id} className="relative mb-4 last:mb-0">
                  <span
                    className="absolute -left-[1.15rem] top-1.5 h-2.5 w-2.5 rounded-full bg-primary ring-2 ring-background"
                    aria-hidden
                  />
                  <div className="rounded-[2px] border border-border bg-muted/30 p-3">
                    <p className="font-medium text-foreground">
                      <span>{requirementStatusLabel(requirementStatuses, event.fromStatus)}</span>
                      <span className="mx-1.5 text-muted-foreground">→</span>
                      <span>{requirementStatusLabel(requirementStatuses, event.toStatus)}</span>
                    </p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {userById.get(event.changedById)?.name ?? event.changedById}
                      {" · "}
                      <time dateTime={event.changedAt}>
                        {new Date(event.changedAt).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })}
                      </time>
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </details>
      </section>
    </AppShell>
  );
}
