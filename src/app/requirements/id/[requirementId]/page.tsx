import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import {
  getCatalogByKind,
  getClients,
  getContractBudgets,
  getCubicacionItemByRequirementId,
  getRequirementById,
  getRequirementComments,
  getRequirements,
  getRequirementStatusHistory,
  getRequirementTasks,
  getTimeEntries,
  getUsers,
  getProfiles,
} from "@/data/repositories/server-db";
import { calcCubicacionRow } from "@/lib/calculations/cubicacion";
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
import { RequirementEditModal } from "@/components/requirements/requirement-edit-modal";
import { RequirementTasksPanel } from "@/components/requirements/requirement-tasks-panel";
import { RequirementDetailHeader } from "@/components/requirements/requirement-detail-header";
import { RequirementDetailShell } from "@/components/requirements/requirement-detail-shell";
import { RequirementDetailSummaryTab } from "@/components/requirements/requirement-detail-summary-tab";
import type { RequirementCubicacionBannerProps } from "@/components/requirements/requirement-cubicacion-banner";
import type { Profile, SettingsCatalogEntry, TimeEntry, User } from "@/types/domain";

function catalogLabel(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.active && e.code === code);
  return entry?.label ?? code;
}

function catalogColor(catalog: SettingsCatalogEntry[], code: string): string | null {
  return catalog.find((e) => e.active && e.code === code)?.color ?? null;
}

function requirementStatusLabel(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.active && e.code === code);
  return formatStatusLabel(code, entry?.label ?? code);
}

function minutesToHoursDisplay(minutes: number): string {
  return `${(minutes / 60).toFixed(2)} h`;
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

/** Asigna el perfil del usuario a uno de los tres buckets de cubicación. */
function mapProfileToBucket(profileName: string | undefined): "senior" | "ingeniero" | "junior" | "director" | "disenador" {
  if (!profileName) return "ingeniero";
  const lower = profileName.toLowerCase();
  if (lower.includes("senior") || lower.includes("sr.")) return "senior";
  if (lower.includes("junior") || lower.includes("jr")) return "junior";
  if (lower.includes("director")) return "director";
  if (lower.includes("dise")) return "disenador";
  return "ingeniero";
}

export default async function RequirementDetailPage({ params }: { params: Promise<{ requirementId: string }> }) {
  // Paso 1: Requerimiento + sesión en paralelo (necesitamos contractId antes del resto)
  const [sessionUser, { requirementId }] = await Promise.all([
    requirePermission("requirements.read"),
    params,
  ]);
  const requirement = await getRequirementById(requirementId);
  if (!requirement) {
    notFound();
  }

  // Paso 2: Resto de datos (incluyendo cubicación si hay contrato)
  const [
    comments,
    history,
    entries,
    requirements,
    clients,
    users,
    profiles,
    timeCategories,
    requirementStatuses,
    requirementPriorities,
    contracts,
    linkedCubicacion,
    tasks,
  ] = await Promise.all([
    getRequirementComments(requirementId),
    getRequirementStatusHistory(requirementId),
    getTimeEntries(),
    getRequirements(),
    getClients(),
    getUsers(),
    getProfiles(),
    getCatalogByKind("time_entry_category"),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
    getContractBudgets(),
    getCubicacionItemByRequirementId(requirementId),
    getRequirementTasks(requirementId),
  ]);
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(sessionUser, users);
  if (sessionUser.role === "Contributor" && requirement.ownerId !== currentDirectoryUserId) {
    notFound();
  }

  const requirementEntries = entries.filter((entry) => entry.requirementId === requirementId);
  const clientName = clients.find((c) => c.id === requirement.clientId)?.name ?? requirement.clientId;
  const userById = new Map(users.map((u) => [u.id, u]));
  const profileById = new Map(profiles.map((p) => [p.id, p]));
  const catLabel = (code: string) => catalogLabel(timeCategories, code);

  const totalMinutes = requirementEntries.reduce((acc, item) => acc + item.durationMinutes, 0);
  const { byProfile, byCategory } = buildHoursBreakdown(requirementEntries, userById, profileById, catLabel);

  const canManageAnyTimeEntry = sessionUser.role === "Admin" || sessionUser.role === "Project Manager";
  const hourRows = [...requirementEntries]
    .sort((a, b) => {
      const d = b.date.localeCompare(a.date);
      if (d !== 0) return d;
      return b.startTime.localeCompare(a.startTime);
    })
    .map((e) => {
      const user = userById.get(e.userId);
      const profile = user ? profileById.get(user.profileId) : undefined;
      const canManageOwnEntryAndRequirement =
        e.userId === currentDirectoryUserId && requirement.ownerId === currentDirectoryUserId;
      return {
        id: e.id,
        entry: e,
        canEdit: canManageAnyTimeEntry || canManageOwnEntryAndRequirement,
        canDelete: canManageAnyTimeEntry || canManageOwnEntryAndRequirement,
        date: e.date,
        userName: user?.name ?? e.userId,
        profileName: profile?.name ?? "—",
        contractStatus: e.contractId
          ? e.contractProfileId
            ? profileById.get(e.contractProfileId)?.name ?? e.contractProfileId
            : "Sin asignación contractual"
          : "Sin contrato",
        categoryLabel: catLabel(e.category),
        durationDisplay: minutesToHoursDisplay(e.durationMinutes),
        timeRange: `${e.startTime}–${e.endTime ?? "Pendiente"}`,
        taskDescription: e.taskDescription,
      };
    });

  const statusLabel = requirementStatusLabel(requirementStatuses, requirement.status);
  const statusCatalogColor = catalogColor(requirementStatuses, requirement.status);
  const priorityLabel = catalogLabel(requirementPriorities, requirement.priority);
  const priorityCatalogColor = catalogColor(requirementPriorities, requirement.priority);
  const effectiveContractId = requirement.contractId ?? linkedCubicacion?.contractId ?? null;
  const contract = effectiveContractId ? contracts.find((c) => c.id === effectiveContractId) : undefined;
  const contractLabel = contract ? `${contract.code} · ${contract.name}` : null;

  // ── Cubicación vinculada al requerimiento ─────────────────────────────────
  const cubicacionCalc = linkedCubicacion ? calcCubicacionRow(linkedCubicacion) : null;

  // Horas usadas por bucket de perfil (Senior / Ingeniero / Junior / Director / Diseñador)
  const usedByBucket = { senior: 0, ingeniero: 0, junior: 0, director: 0, disenador: 0 };
  for (const entry of requirementEntries) {
    const contractProfile = entry.contractProfileId
      ? profileById.get(entry.contractProfileId)
      : undefined;
    const user = userById.get(entry.userId);
    const userProfile = user ? profileById.get(user.profileId) : undefined;
    const bucket = mapProfileToBucket(contractProfile?.name ?? userProfile?.name);
    usedByBucket[bucket] += entry.durationMinutes / 60;
  }
  const usedHorasTotal = requirementEntries.reduce((a, e) => a + e.durationMinutes, 0) / 60;

  const canPostObservations = roleHasPermission(sessionUser.role, "requirements.write");
  const canManageTasks = roleHasPermission(sessionUser.role, "requirements.read");
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

  const tasksDone = tasks.filter((task) => task.status === "done").length;

  const cubicacionBannerProps: RequirementCubicacionBannerProps | null =
    cubicacionCalc && linkedCubicacion && effectiveContractId
      ? {
          contractId: effectiveContractId,
          totalHoras: cubicacionCalc.totalHoras,
          usedHorasTotal,
          senior: {
            label: "Ingeniero Senior",
            allocatedHoras: cubicacionCalc.seniorHoras,
            usedHoras: Math.round(usedByBucket.senior * 100) / 100,
          },
          ingeniero: {
            label: "Ingeniero",
            allocatedHoras: cubicacionCalc.ingenieroHoras,
            usedHoras: Math.round(usedByBucket.ingeniero * 100) / 100,
          },
          junior: {
            label: "Ingeniero Junior",
            allocatedHoras: cubicacionCalc.juniorHoras,
            usedHoras: Math.round(usedByBucket.junior * 100) / 100,
          },
          director: {
            label: "Director",
            allocatedHoras: cubicacionCalc.directorHoras,
            usedHoras: Math.round(usedByBucket.director * 100) / 100,
          },
          disenador: {
            label: "Diseñador",
            allocatedHoras: cubicacionCalc.disenadorHoras,
            usedHoras: Math.round(usedByBucket.disenador * 100) / 100,
          },
        }
      : null;

  const activityEvents: RequirementActivityEvent[] = [
    ...history.map((event) => ({
      id: `status-${event.id}`,
      type: "status" as const,
      title: `${requirementStatusLabel(requirementStatuses, event.fromStatus)} → ${requirementStatusLabel(requirementStatuses, event.toStatus)}`,
      description: `Cambio realizado por ${userById.get(event.changedById)?.name ?? event.changedById}.`,
      at: event.changedAt,
      href: "#activity-section",
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
      title: "Registro de horas",
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
      />

      <RequirementDetailHeader
        requirementId={requirementId}
        requirementTitle={requirement.title}
        clientName={clientName}
        contractLabel={contractLabel}
        effectiveContractId={effectiveContractId}
        origin={requirement.origin ?? null}
        createdAt={requirement.createdAt}
        completedAt={requirement.completedAt ?? null}
        notes={requirement.notes}
        status={requirement.status}
        statusLabel={statusLabel}
        statusColor={statusCatalogColor}
        priority={requirement.priority}
        priorityLabel={priorityLabel}
        priorityColor={priorityCatalogColor}
        ownerId={requirement.ownerId}
        owners={users.map((u) => ({ id: u.id, name: u.name }))}
        canReassignOwner={canReassignOwner}
        canChangeStatus={canPostObservations}
        statusOptions={requirementStatuses.filter((s) => s.active).map((s) => ({ code: s.code, label: s.label }))}
        registerHoursHref={`/time-entries?nueva=1&requirementId=${requirementId}`}
        editAction={
          <RequirementEditModal
            requirement={requirement}
            clients={clients.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }))}
            contracts={contracts
              .filter((contract) => contract.active)
              .map((contract) => ({ id: contract.id, clientId: contract.clientId, label: `${contract.code} · ${contract.name}` }))}
            statusOptions={requirementStatuses.filter((s) => s.active).map((s) => ({ code: s.code, label: s.label }))}
            priorityOptions={requirementPriorities.filter((p) => p.active).map((p) => ({ code: p.code, label: p.label }))}
            owners={users.map((u) => ({ id: u.id, name: u.name }))}
            canManageRequirement={canManageRequirement}
            triggerLabel="Editar requerimiento"
            triggerClassName="btn-secondary py-2 text-sm"
          />
        }
      />

      <Suspense
        fallback={
          <div className="space-y-4">
            <div className="skeleton-shimmer h-10 w-full rounded-[2px]" />
            <div className="skeleton-shimmer h-48 w-full rounded-[2px]" />
          </div>
        }
      >
        <RequirementDetailShell
          sectionCounts={{
            hours: requirementEntries.length,
            tasksDone,
            tasksTotal: tasks.length,
            comments: comments.length,
          }}
          summaryContent={
            <RequirementDetailSummaryTab
              totalHoursDisplay={minutesToHoursDisplay(totalMinutes)}
              imputationCount={requirementEntries.length}
              tasksDone={tasksDone}
              tasksTotal={tasks.length}
              cubicacion={cubicacionBannerProps}
            />
          }
          planContent={
            <RequirementTasksPanel requirementId={requirementId} initialTasks={tasks} canManage={canManageTasks} />
          }
          horasContent={
            <RequirementHoursPanel
              rows={hourRows}
              byProfile={byProfile.map(({ label, hoursDisplay }) => ({ label, hoursDisplay }))}
              byCategory={byCategory.map(({ label, hoursDisplay }) => ({ label, hoursDisplay }))}
              totalHoursDisplay={minutesToHoursDisplay(totalMinutes)}
              imputationCount={requirementEntries.length}
              users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }))}
              clients={clients.filter((client) => client.active).map((client) => ({ id: client.id, name: client.name }))}
              requirements={requirements.map((r) => ({ id: r.id, title: r.title, clientId: r.clientId }))}
              contracts={contracts
                .filter((contract) => contract.active)
                .map((contract) => ({ id: contract.id, clientId: contract.clientId, label: `${contract.code} · ${contract.name}` }))}
              contractProfiles={profiles.map((profile) => ({ id: profile.id, label: profile.name }))}
              categories={timeCategories.filter((c) => c.active).map((c) => ({ code: c.code, label: c.label }))}
              canPickAnyOwner={canManageAnyTimeEntry}
            />
          }
          sidebarContent={
            <>
              <div id="comments-section">
                <RequirementObservationsChat
                  requirementId={requirementId}
                  messages={observationMessages}
                  canPost={canPostObservations}
                />
              </div>
              <div id="activity-section">
                <RequirementActivityTimeline events={activityEvents} defaultExpanded />
              </div>
            </>
          }
        />
      </Suspense>
    </AppShell>
  );
}
