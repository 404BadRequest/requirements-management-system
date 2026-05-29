import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getCatalogByKind, getClients, getOperationalUsers } from "@/data/repositories/server-db";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET() {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "requirements.write");
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  if (user.role !== "Admin" && user.role !== "Project Manager") {
    return NextResponse.json({ error: "Solo Admin y Project Manager pueden descargar la plantilla masiva." }, { status: 403 });
  }

  const [clients, users, statusCatalog, priorityCatalog] = await Promise.all([
    getClients(),
    getOperationalUsers(),
    getCatalogByKind("requirement_status"),
    getCatalogByKind("requirement_priority"),
  ]);
  const activeUsers = users.filter((entry) => entry.active);
  const activeClients = clients.filter((entry) => entry.active);
  const defaultOwnerId = resolveDirectoryUserIdForSession(user, activeUsers);
  const defaultStatus = statusCatalog.find((entry) => entry.active)?.code ?? "nuevo";
  const defaultPriority = priorityCatalog.find((entry) => entry.active)?.code ?? "media";
  const defaultClientId = activeClients[0]?.id ?? "client-001";

  const headers = ["projectId", "clientId", "contractId", "origin", "title", "description", "priority", "ownerId", "status", "notes"];
  const example = [
    "project-001",
    defaultClientId,
    "",
    "Operación interna",
    "Carga masiva de requerimiento",
    "Descripción base del requerimiento",
    defaultPriority,
    defaultOwnerId,
    defaultStatus,
    "Creado desde plantilla CSV",
  ];

  const body = `\uFEFF${headers.join(",")}\n${example.map((cell) => csvEscape(String(cell))).join(",")}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="requirements-template.csv"',
    },
  });
}
