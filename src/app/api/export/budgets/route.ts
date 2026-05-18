import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getBudgets } from "@/data/repositories/server-db";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "exports.run");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const projectId = req.nextUrl.searchParams.get("projectId")?.trim() ?? "";
  const rows = await getBudgets();
  const filtered = projectId ? rows.filter((b) => b.projectId === projectId) : rows;

  const header = ["id", "projectId", "scope", "profileId", "quotedMinutes", "createdAt", "updatedAt"];
  const lines = [
    header.join(","),
    ...filtered.map((r) =>
      [r.id, r.projectId, r.scope, r.profileId, String(r.quotedMinutes), r.createdAt, r.updatedAt]
        .map((cell) => csvEscape(String(cell)))
        .join(","),
    ),
  ];
  const body = `\uFEFF${lines.join("\n")}`;
  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="budgets.csv"',
    },
  });
}
