import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AppShell } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/common/page-header";
import { CopyButton } from "@/components/common/copy-button";
import {
  getCatalogByKind,
  getClients,
  getContractBudgets,
  getOperationalProfiles,
  getOperationalUsers,
  getProfiles,
  getProjects,
  getRequirements,
  getTimeEntryById,
  getUsers,
} from "@/data/repositories/server-db";
import { filterOperationalProfiles, filterOperationalUsers } from "@/lib/profiles/operational-scope";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { requirementDetailPath } from "@/lib/routes/requirements";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { TimeEntryEditModal } from "@/components/time-entries/time-entry-edit-modal";
import type { SettingsCatalogEntry } from "@/types/domain";

export const metadata: Metadata = { title: "Ficha de horas" };

function catalogLabel(catalog: SettingsCatalogEntry[], code: string): string {
  const entry = catalog.find((e) => e.active && e.code === code);
  return entry?.label ?? code;
}

function minutesToHoursDisplay(minutes: number): string {
  return `${(minutes / 60).toFixed(2)} h`;
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
  const [entry, allUsers, allProfiles, requirements, clients, projects, categories, contracts] = await Promise.all([
    getTimeEntryById(id),
    getUsers(),
    getProfiles(),
    getRequirements(),
    getClients(),
    getProjects(),
    getCatalogByKind("time_entry_category"),
    getContractBudgets(),
  ]);
  const users = filterOperationalUsers(allUsers, allProfiles);
  const profiles = filterOperationalProfiles(allProfiles);

  if (!entry) {
    notFound();
  }

  const user = allUsers.find((u) => u.id === entry.userId);
  const profile = user ? allProfiles.find((p) => p.id === user.profileId) : undefined;
  const requirement = entry.requirementId ? requirements.find((r) => r.id === entry.requirementId) : undefined;
  const client = requirement ? clients.find((c) => c.id === requirement.clientId) : (entry.clientId ? clients.find((c) => c.id === entry.clientId) : undefined);
  const project = projects.find((p) => p.id === entry.projectId);
  const contract = entry.contractId ? contracts.find((row) => row.id === entry.contractId) : undefined;
  const contractProfile = entry.contractProfileId ? allProfiles.find((row) => row.id === entry.contractProfileId) : undefined;
  const categoryLabel = catalogLabel(categories, entry.category);
  const currentDirectoryUserId = resolveDirectoryUserIdForSession(sessionUser, allUsers);
  const canPickAnyOwner = sessionUser.role === "Admin" || sessionUser.role === "Project Manager";
  if (sessionUser.role === "Contributor" && entry.userId !== currentDirectoryUserId) {
    notFound();
  }
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

  const isInProgress = !entry.endTime;

  return (
    <AppShell>
      <PageHeader
        title="Ficha de horas"
        description={`${dateDisplay} · ${categoryLabel}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href={`/time-entries?nueva=1&duplicateId=${encodeURIComponent(entry.id)}`} className="btn-secondary no-underline">
              Duplicar
            </Link>
            <TimeEntryEditModal
              entry={entry}
              users={users.filter((u) => u.active).map((u) => ({ id: u.id, name: u.name }))}
              clients={clients.filter((c) => c.active).map((c) => ({ id: c.id, name: c.name }))}
              requirements={requirements.map((r) => ({ id: r.id, title: r.title, clientId: r.clientId }))}
              contracts={contracts
                .filter((c) => c.active)
                .map((c) => ({ id: c.id, clientId: c.clientId, label: `${c.code} · ${c.name}` }))}
              contractProfiles={profiles.map((p) => ({ id: p.id, label: p.name }))}
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

      {/* ── 1. Hero: métricas de tiempo ─────────────────────────────────── */}
      <section className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <article className="surface-card flex h-full flex-col p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Fecha contable</h3>
          <p className="mt-2 font-mono text-sm tabular-nums text-foreground">{entry.date}</p>
          <p className="mt-1 text-xs capitalize text-muted-foreground">{dateDisplay}</p>
        </article>

        {/* Duración — tarjeta con acento primario */}
        <article className="surface-card flex h-full flex-col border-l-2 border-l-primary p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Duración</h3>
          <div className="mt-2 flex flex-wrap items-baseline gap-2">
            <p className="text-3xl font-bold tabular-nums text-foreground">
              {isInProgress ? "—" : minutesToHoursDisplay(entry.durationMinutes)}
            </p>
            {isInProgress ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-amber-500" aria-hidden />
                En curso
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-semibold text-green-700">
                <span className="h-1.5 w-1.5 rounded-full bg-green-500" aria-hidden />
                Completado
              </span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {isInProgress ? "Falta registrar hora de término." : `${entry.durationMinutes} minutos`}
          </p>
        </article>

        <article className="surface-card flex h-full flex-col p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Bloque horario</h3>
          <p className="mt-2 font-mono text-2xl tabular-nums text-foreground">
            {entry.startTime} – {entry.endTime ?? "···"}
          </p>
        </article>

        <article className="surface-card flex h-full flex-col p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Categoría</h3>
          <p className="mt-2 text-lg font-semibold leading-snug text-foreground">{categoryLabel}</p>
          <p className="mt-1 font-mono text-[10px] text-muted-foreground">{entry.category}</p>
        </article>
      </section>

      {/* ── 2. Contexto — definition list en un solo card ───────────────── */}
      <article className="surface-card p-5">
        <h3 className="mb-4 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contexto</h3>
        <dl className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Persona</dt>
            <dd className="mt-1">
              <Link
                href={`/time-entries?userId=${entry.userId}`}
                className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
              >
                {user?.name ?? entry.userId}
              </Link>
              <span className="mt-0.5 block text-[11px] text-muted-foreground">Ver todas sus horas →</span>
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perfil de tarifa</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">{profile?.name ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Proyecto</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {project?.name ?? entry.projectId}
              {project?.code ? (
                <span className="ml-1.5 font-mono text-[10px] font-normal text-muted-foreground">({project.code})</span>
              ) : null}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Cliente</dt>
            <dd className="mt-1">
              {client ? (
                <>
                  <Link
                    href={`/dashboard?clientId=${client.id}`}
                    className="text-sm font-semibold text-foreground hover:text-primary hover:underline"
                  >
                    {client.name}
                  </Link>
                  <span className="mt-0.5 block text-[11px] text-muted-foreground">Ver en dashboard →</span>
                </>
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  {requirement ? requirement.clientId : "—"}
                  {!requirement ? (
                    <span className="block text-xs font-normal text-muted-foreground">Sin requerimiento vinculado</span>
                  ) : null}
                </span>
              )}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Perfil contractual</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {!entry.contractId ? "Sin contrato" : (contractProfile?.name ?? "Sin asignación")}
            </dd>
          </div>
          <div>
            <dt className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contrato</dt>
            <dd className="mt-1 text-sm font-semibold text-foreground">
              {contract ? (
                <>
                  <span>{contract.code} · {contract.name}</span>
                  <Link
                    href={`/time-entries?clientId=${client?.id ?? ""}`}
                    className="mt-0.5 block text-[11px] text-primary hover:underline"
                  >
                    Ver horas de este contrato →
                  </Link>
                </>
              ) : "—"}
            </dd>
          </div>
        </dl>
      </article>

      {/* ── 3. Contenido — dos columnas ─────────────────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Columna izquierda 2/3: requerimiento + tarea */}
        <div className="flex flex-col gap-4 lg:col-span-2">
          <article className="surface-card p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Requerimiento</h3>
            {requirement ? (
              <div className="mt-3">
                <p className="text-base font-semibold text-foreground">{requirement.title}</p>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <Link
                    href={requirementDetailPath(requirement.id)}
                    className="inline-flex items-center gap-1 rounded-[2px] border border-primary/30 bg-primary/5 px-2.5 py-1 text-xs font-medium text-primary transition-colors hover:bg-primary/10 no-underline"
                  >
                    Ver ficha del requerimiento →
                  </Link>
                  <span className="font-mono text-[10px] text-muted-foreground">{requirement.id}</span>
                </div>
              </div>
            ) : (
              <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                Esta hora no está asociada a un requerimiento (p. ej. horas internas o generales del proyecto).
              </p>
            )}
          </article>

          <article className="surface-card flex flex-1 flex-col p-5">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tarea / trabajo realizado</h3>
            <div className="mt-3">
              {entry.taskDescription?.trim() ? (
                <p className="border-l-2 border-primary/30 pl-4 text-sm leading-relaxed text-foreground whitespace-pre-wrap">
                  {entry.taskDescription}
                </p>
              ) : (
                <p className="text-sm italic text-muted-foreground">No se registró descripción de la tarea.</p>
              )}
            </div>
          </article>
        </div>

        {/* Columna derecha 1/3: observaciones */}
        <article className="surface-card p-5 lg:col-span-1">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Observaciones</h3>
          <div className="mt-3">
            {entry.observations?.trim() ? (
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{entry.observations}</p>
            ) : (
              <p className="text-sm italic text-muted-foreground">Sin observaciones adicionales.</p>
            )}
          </div>
        </article>
      </div>

      {/* ── 4. Footer compacto ──────────────────────────────────────────── */}
      <footer className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-[2px] border border-border bg-muted/15 px-4 py-2.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="font-medium text-foreground">ID</span>
          <span className="font-mono tabular-nums">{entry.id}</span>
          <CopyButton text={entry.id} label="Copiar ID" />
        </span>
        <span aria-hidden>·</span>
        <span>
          Creado: <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
        </span>
        <span aria-hidden>·</span>
        <span>
          Actualizado: <time dateTime={entry.updatedAt}>{formatDateTime(entry.updatedAt)}</time>
        </span>
      </footer>
    </AppShell>
  );
}
