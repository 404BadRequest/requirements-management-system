import { NextResponse, type NextRequest } from "next/server";
import { getAppSession } from "@/lib/auth/session";
import { assertPermission } from "@/lib/auth/permissions";
import { getProfiles, getRequirements, getTimeEntries, getUsers } from "@/data/repositories/server-db";
import { buildTeamDirectoryRows } from "@/app/team/team-page-utils";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "exports.run");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const [users, entries, requirements, profiles] = await Promise.all([
    getUsers(),
    getTimeEntries(),
    getRequirements(),
    getProfiles(),
  ]);
  const rows = buildTeamDirectoryRows(users, entries, requirements, profiles);
  const header = [
    "id",
    "name",
    "email",
    "profile",
    "Tarifa referencia",
    "hours",
    "estimateLabel",
    "reqsAssigned",
    "status",
  ];
  const lines = [
    header.join(","),
    ...rows.map((r) =>
      [
        r.id,
        r.name,
        r.email,
        r.profileLabel,
        r.rateLabel,
        r.hoursDisplay,
        r.estimateLabel,
        String(r.reqsAssigned),
        r.activeLabel,
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
      "Content-Disposition": 'attachment; filename="equipo.csv"',
    },
  });
}
