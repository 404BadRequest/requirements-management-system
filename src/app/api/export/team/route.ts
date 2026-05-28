import { NextResponse, type NextRequest } from "next/server";
import { buildTeamDirectoryRows, isValidRoleFilter } from "@/app/team/team-page-utils";
import { getProfiles, getRequirements, getTimeEntries, getUsers, getFinancialReferenceRates } from "@/data/repositories/server-db";
import { assertPermission } from "@/lib/auth/permissions";
import { getAppSession } from "@/lib/auth/session";
import { defaultTeamDateRange, normalizeDateRange } from "@/lib/calculations/team-utilization";
import { csvEscape } from "@/lib/export/csv-escape";

export async function GET(req: NextRequest) {
  const { user } = await getAppSession();
  try {
    assertPermission(user?.role, "exports.run");
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const defaults = defaultTeamDateRange();
  const fromParam = req.nextUrl.searchParams.get("from")?.trim() || defaults.from;
  const toParam = req.nextUrl.searchParams.get("to")?.trim() || defaults.to;
  const { from, to } = normalizeDateRange(fromParam, toParam);
  const roleParam = req.nextUrl.searchParams.get("role")?.trim() ?? "";
  const profileParam = req.nextUrl.searchParams.get("profileId")?.trim() ?? "";
  const activeOnly = req.nextUrl.searchParams.get("activeOnly") !== "0";

  const [users, entries, requirements, profiles, referenceRates] = await Promise.all([
    getUsers(),
    getTimeEntries(),
    getRequirements(),
    getProfiles(),
    getFinancialReferenceRates(),
  ]);

  const rows = buildTeamDirectoryRows(
    users,
    entries,
    requirements,
    profiles,
    {
      from,
      to,
      role: isValidRoleFilter(roleParam) ? roleParam : undefined,
      profileId: profiles.some((profile) => profile.id === profileParam) ? profileParam : undefined,
      activeOnly,
    },
    referenceRates.weeklyCapacityHours,
  );

  const header = [
    "id",
    "name",
    "email",
    "role",
    "profile",
    "Tarifa referencia",
    "hours",
    "openReqs",
    "utilizationPercent",
    "estimateLabel",
    "status",
    "from",
    "to",
  ];
  const lines = [
    header.join(","),
    ...rows.map((row) =>
      [
        row.id,
        row.name,
        row.email,
        row.role,
        row.profileLabel,
        row.rateLabel,
        row.hoursDisplay,
        String(row.openReqsCount),
        row.utilizationDisplay,
        row.estimateLabel,
        row.activeLabel,
        from,
        to,
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
