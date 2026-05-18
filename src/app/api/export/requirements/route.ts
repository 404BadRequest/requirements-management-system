import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getRequirements } from "@/data/repositories/server-db";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "exports.run");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const clientId = req.nextUrl.searchParams.get("clientId")?.trim() ?? "";
  const all = await getRequirements();
  const rows = all.filter((r) => {
    if (projectId && r.projectId !== projectId) return false;
    if (clientId && r.clientId !== clientId) return false;
    return true;
  });
  const header = ["id", "projectId", "clientId", "title", "status", "priority", "ownerId", "createdAt"];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.projectId,
        r.clientId,
        r.title,
        r.status,
        r.priority,
        r.ownerId,
        r.createdAt,
      ]
        .map((cell) => csvEscape(String(cell)))
        .join(","),
    ),
  ];
  const body = `\uFEFF${lines.join("\n")}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="requirements.csv"',
    },
  });
}
