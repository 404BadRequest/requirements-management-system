import { NextResponse } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getCatalogByKind, getUsers } from "@/data/repositories/server-db";
import { resolveDirectoryUserIdForSession } from "@/lib/auth/resolve-directory-user";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET() {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "time_entries.write");
  } catch {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  if (!user) {
    return NextResponse.json({ error: "Debes iniciar sesión." }, { status: 401 });
  }
  if (user.role !== "Admin" && user.role !== "Project Manager") {
    return NextResponse.json({ error: "Solo Admin y Project Manager pueden descargar la plantilla masiva." }, { status: 403 });
  }

  const [users, categories] = await Promise.all([getUsers(), getCatalogByKind("time_entry_category")]);
  const activeUsers = users.filter((entry) => entry.active);
  const defaultUserId = resolveDirectoryUserIdForSession(user, activeUsers);
  const defaultCategory = categories.find((entry) => entry.active)?.code ?? "analisis";
  const today = new Date().toISOString().slice(0, 10);

  const headers = [
    "projectId",
    "requirementId",
    "contractId",
    "contractProfileId",
    "category",
    "taskDescription",
    "date",
    "startTime",
    "endTime",
    "userId",
    "observations",
  ];
  const example = [
    "project-001",
    "",
    "",
    "",
    defaultCategory,
    "Análisis funcional de requerimiento",
    today,
    "09:00",
    "11:00",
    defaultUserId,
    "Carga masiva plantilla",
  ];
  const body = `\uFEFF${headers.join(",")}\n${example.map((cell) => csvEscape(String(cell))).join(",")}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="time-entries-template.csv"',
    },
  });
}
