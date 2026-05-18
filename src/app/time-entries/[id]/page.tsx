import Link from "next/link";
import { notFound } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import {
  getCatalogByKind,
  getClients,
  getProfiles,
  getProjects,
  getRequirements,
  getTimeEntryById,
  getUsers,
} from "@/data/repositories/server-db";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { requirementDetailPath } from "@/lib/routes/requirements";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { TimeEntryEditModal } from "@/components/time-entries/time-entry-edit-modal";
import type { SettingsCatalogEntry } from "@/types/domain";

function catalogLabel(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.active && e.code === code);
  return entry?.label ?? code;
}

function minutesToHoursDisplay(minutes: number): string {
  return `${(minutes / 60).toFixed(1)} h`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return iso;
  }
}

export default async function TimeEntryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const sessionUser = await requirePermission("time_entries.read");
  const { id } = await params;
  const [entry, users, profiles, requirements, clients, projects, categories] = await Promise.all([
    getTimeEntryById(id),
    getUsers(),
    getProfiles(),
    getRequirements(),
    getClients(),
    getProjects(),
    getCatalogByKind("time_entry_category"),
  ]);

  if (!entry) {
    notFound();
  }

  const user = users.find((u) => u.id === entry.userId);
  const profile = user ? profiles.find((p) => p.id === user.profileId) : undefined;
  const requirement = entry.requirementId ? requirements.find((r) => r.id === entry.requirementId) : undefined;
  const client = requirement ? clients.find((c) => c.id === requirement.clientId) : undefined;
  const project = projects.find((p) => p.id === entry.projectId);
  const categoryLabel = catalogLabel(categories, entry.category);
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(sessionUser, users);
  const canPickAnyOwner = sessionUser.role === "Admin" || sessionUser.role === "Project Manager";
  const canEditEntry = canPickAnyOwner || currentDirectoryUserId === entry.userId;

  const dateDisplay = (() => {
    try {
      return new Date(`${entry.date}T12:00:00`).toLocaleDateString("es-CL", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    } catch {
      return entry.date;
    }
  })();

  return (
    <AppShell>
      <PageHeader
        title="Ficha de imputación"
        description={`${dateDisplay} · ${minutesToHoursDisplay(entry.durationMinutes)} · ${categoryLabel}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <TimeEntryEditModal
              entry={entry}
              users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }))}
              requirements={requirements.map((r) => ({ id: r.id, title: r.title }))}
              categories={categories.filter((c) => c.active).map((c) => ({ code: c.code, label: c.label }))}
              canEdit={canEditEntry}
              canPickAnyOwner={canPickAnyOwner}
            />
            <Link href="/time-entries" className="btn-secondary no-underline">
              Volver al listado
            </Link>
          </div>
        }
      />

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Fecha contable</h3>
          <p className="mt-2 font-mono text-sm tabular-nums text-foreground">{entry.date}</p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">{dateDisplay}</p>
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Duración</h3>
          <p className="mt-2 text-xl font-semibold tabular-nums text-foreground">{minutesToHoursDisplay(entry.durationMinutes)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{entry.durationMinutes} minutos</p>
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Bloque horario</h3>
          <p className="mt-2 font-mono text-lg tabular-nums text-foreground">
            {entry.startTime} – {entry.endTime}
          </p>
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Categoría</h3>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{categoryLabel}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{entry.category}</p>
        </article>
      </section>

      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Persona</h3>
          <p className="mt-2 text-lg font-semibold text-foreground">{user?.name ?? entry.userId}</p>
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Perfil de tarifa</h3>
          <p className="mt-2 text-lg font-semibold text-foreground">{profile?.name ?? "—"}</p>
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Proyecto</h3>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{project?.name ?? entry.projectId}</p>
          {project?.code ? <p className="mt-1 font-mono text-[10px] text-muted-foreground">{project.code}</p> : null}
        </article>
        <article className="surface-card p-4">
          <h3 className="text-sm font-medium text-muted-foreground">Cliente</h3>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{client?.name ?? (requirement ? requirement.clientId : "—")}</p>
          {!requirement ? <p className="mt-1 text-xs text-muted-foreground">Sin requerimiento vinculado: no hay cliente derivado.</p> : null}
        </article>
      </section>

      <article className="surface-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Requerimiento</h3>
        {requirement ? (
          <div className="mt-3 space-y-1">
            <p className="text-lg font-semibold text-foreground">{requirement.title}</p>
            <Link href={requirementDetailPath(requirement.id)} className="font-mono text-[10px] text-primary hover:underline">
              {requirement.id}
            </Link>
          </div>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Esta imputación no está asociada a un requerimiento (p. ej. horas internas o generales del proyecto).
          </p>
        )}
      </article>

      <article className="surface-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Tarea / trabajo realizado</h3>
        <div className="mt-3 rounded-[2px] border border-border bg-muted/20 p-4">
          {entry.taskDescription?.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.taskDescription}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">No se registró descripción de la tarea.</p>
          )}
        </div>
      </article>

      <article className="surface-card p-4">
        <h3 className="text-sm font-medium text-muted-foreground">Observaciones</h3>
        <div className="mt-3 rounded-[2px] border border-border bg-muted/20 p-4">
          {entry.observations?.trim() ? (
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.observations}</p>
          ) : (
            <p className="text-sm italic text-muted-foreground">Sin observaciones adicionales.</p>
          )}
        </div>
      </article>

      <footer className="rounded-[2px] border border-border bg-muted/15 px-4 py-3 text-xs text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">Identificador:</span>{" "}
          <span className="font-mono tabular-nums">{entry.id}</span>
        </p>
        <p className="mt-1">
          Creado: <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
          {" · "}
          Última actualización: <time dateTime={entry.updatedAt}>{formatDateTime(entry.updatedAt)}</time>
        </p>
      </footer>
    </AppShell>
  );
}
