"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { createUserAction, deleteUserAction, updateUserAction } from "@/app/settings/actions";
import { DataTable } from "@/components/common/data-table";
import type { Role, User } from "@/types/domain";
import { SettingsDeleteConfirm } from "@/components/settings/settings-delete-confirm";
import { SettingsModal } from "@/components/settings/settings-modal";
import { SettingsTableToolbar } from "@/components/settings/settings-table-toolbar";

const ROLES: Role[] = ["Admin", "Project Manager", "Contributor", "Viewer"];

export function SettingsUsersPanel({
  users,
  profiles,
  showCredentialStatus,
  credentialsByUserId,
}: {
  users: User[];
  profiles: { id: string; name: string }[];
  showCredentialStatus: boolean;
  credentialsByUserId: Record<string, boolean>;
}) {
  const [createOpen, setCreateOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const profileById = useMemo(() => new Map(profiles.map((p) => [p.id, p.name])), [profiles]);

  const columns = useMemo<ColumnDef<User>[]>(
    () => [
      { accessorKey: "name", header: "Nombre" },
      { accessorKey: "email", header: "Correo" },
      {
        id: "profile",
        header: "Perfil",
        accessorFn: (row) => profileById.get(row.profileId) ?? row.profileId,
      },
      { accessorKey: "role", header: "Rol" },
      {
        accessorKey: "active",
        header: "Estado",
        cell: ({ row }) =>
          row.original.active ? (
            <span className="rounded-[2px] border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">Activo</span>
          ) : (
            <span className="rounded-[2px] border border-border bg-muted px-2 py-0.5 text-xs text-muted-foreground">Inactivo</span>
          ),
      },
      ...(showCredentialStatus
        ? ([
            {
              id: "credentialStatus",
              header: "Acceso",
              accessorFn: (row: User) => (credentialsByUserId[row.id] ? "Configurado" : "Pendiente"),
              cell: ({ row }) =>
                credentialsByUserId[row.original.id] ? (
                  <span className="rounded-[2px] border border-primary/40 bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    Configurado
                  </span>
                ) : (
                  <span className="rounded-[2px] border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-xs font-medium text-amber-700">
                    Pendiente
                  </span>
                ),
            } satisfies ColumnDef<User>,
          ] as ColumnDef<User>[])
        : []),
      {
        id: "aliases",
        header: "Alias",
        accessorFn: (row) => row.aliases.join(", "),
        cell: ({ row }) =>
          row.original.aliases.length ? (
            <span className="text-sm">{row.original.aliases.join(", ")}</span>
          ) : (
            <span className="text-muted-foreground">—</span>
          ),
      },
      {
        id: "actions",
        header: "Acciones",
        enableSorting: false,
        enableGlobalFilter: false,
        cell: ({ row }) => (
          <div className="flex flex-wrap gap-2">
            <button type="button" className="btn-quiet px-2 py-1 text-xs" onClick={() => setEditUser(row.original)}>
              Editar
            </button>
            <SettingsDeleteConfirm
              title="¿Eliminar este usuario?"
              summary="No podrás eliminarlo si tiene requerimientos como responsable."
              action={deleteUserAction.bind(null, row.original.id)}
            />
          </div>
        ),
      },
    ],
    [credentialsByUserId, profileById, showCredentialStatus],
  );

  return (
    <section className="surface-card flex flex-col gap-5 p-[length:var(--density-inset-pad)]">
      <SettingsTableToolbar
        title="Usuarios del sistema"
        description="Tabla principal de personas: busca, ordena y gestiona altas, ediciones y bajas."
        actionLabel="Nuevo usuario"
        onAction={() => setCreateOpen(true)}
      />
      <DataTable
        data={users}
        columns={columns}
        globalFilterPlaceholder="Buscar por nombre, correo, rol, perfil o alias…"
        pageSize={12}
        emptyTitle="Sin usuarios"
        emptyDescription="Añade el primer usuario con el botón «Nuevo usuario»."
      />

      <SettingsModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        title="Nuevo usuario"
        description="Nombre, correo, perfil y contraseña son obligatorios para habilitar acceso al sistema."
      >
        <UserForm profiles={profiles} action={createUserAction} submitLabel="Crear usuario" onDone={() => setCreateOpen(false)} />
      </SettingsModal>

      <SettingsModal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        title="Editar usuario"
        description={editUser?.email}
      >
        {editUser ? (
          <UserForm
            key={editUser.id}
            profiles={profiles}
            action={updateUserAction.bind(null, editUser.id)}
            submitLabel="Guardar cambios"
            initial={editUser}
            onDone={() => setEditUser(null)}
          />
        ) : null}
      </SettingsModal>
    </section>
  );
}

function UserForm({
  profiles,
  action,
  submitLabel,
  initial,
  onDone,
}: {
  profiles: { id: string; name: string }[];
  action: (fd: FormData) => Promise<void>;
  submitLabel: string;
  initial?: User;
  onDone: () => void;
}) {
  const router = useRouter();
  const isEditing = Boolean(initial);
  return (
    <form
      className="grid gap-4 md:grid-cols-2"
      action={async (fd) => {
        await action(fd);
        router.refresh();
        onDone();
      }}
    >
      <label className="grid gap-1.5 md:col-span-2">
        <span className="field-label">Nombre completo</span>
        <input name="name" required defaultValue={initial?.name} className="field-control text-sm" />
      </label>
      <label className="grid gap-1.5 md:col-span-2">
        <span className="field-label">Correo</span>
        <input name="email" type="email" required defaultValue={initial?.email} className="field-control text-sm" />
      </label>
      <label className="grid gap-1.5 md:col-span-2">
        <span className="field-label">{isEditing ? "Nueva contraseña (opcional)" : "Contraseña"}</span>
        <input
          name="password"
          type="password"
          required={!isEditing}
          minLength={8}
          autoComplete={isEditing ? "new-password" : "new-password"}
          placeholder={isEditing ? "Dejar vacío para mantener la contraseña actual" : "Mínimo 8 caracteres"}
          className="field-control text-sm"
        />
        <span className="text-xs text-muted-foreground">
          {isEditing
            ? "Si defines una nueva contraseña, se actualizarán las credenciales de acceso."
            : "El usuario podrá iniciar sesión con su correo y esta contraseña."}
        </span>
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Perfil</span>
        <select name="profileId" required defaultValue={initial?.profileId} className="field-control text-sm">
          {profiles.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5">
        <span className="field-label">Rol</span>
        <select name="role" defaultValue={initial?.role ?? "Contributor"} className="field-control text-sm">
          {ROLES.map((r) => (
            <option key={r} value={r}>
              {r}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1.5 md:col-span-2">
        <span className="field-label">Alias (opcional)</span>
        <input
          name="aliases"
          placeholder="alias1, alias2"
          defaultValue={initial?.aliases.join(", ")}
          className="field-control text-sm"
        />
      </label>
      <label className="grid gap-1.5 md:col-span-2">
        <span className="field-label">Estado</span>
        <select name="active" defaultValue={initial?.active !== false ? "true" : "false"} className="field-control text-sm md:max-w-xs">
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2 md:col-span-2">
        <button type="submit" className="btn-primary">
          {submitLabel}
        </button>
        <button type="button" className="btn-secondary" onClick={onDone}>
          Cancelar
        </button>
      </div>
    </form>
  );
}
