import * as XLSX from "xlsx";
import type { HoursByProfileRow, HoursByProjectRow, HoursByUserRow, HoursReportSummary } from "@/lib/reports/hours-aggregations";
import type { ContractValuationRow, ProjectValuationRow } from "@/lib/reports/contract-valuation-report";
import type { SpendReportRow } from "@/lib/reports/spend-report";

export type BuildReportsWorkbookParams = {
  filters: {
    from: string;
    to: string;
    clientLabel: string;
    projectLabel: string;
  };
  summary: HoursReportSummary;
  byProfile: HoursByProfileRow[];
  byUser: HoursByUserRow[];
  byProject: HoursByProjectRow[];
  contractValuation: ContractValuationRow[];
  projectValuation: ProjectValuationRow[];
  spendRows: SpendReportRow[];
  includeValuation: boolean;
};

function autoWidthSheet(rows: (string | number)[][]): XLSX.ColInfo[] {
  const widths = rows[0]?.map((_, colIndex) => {
    const maxLen = rows.reduce((acc, row) => {
      const cell = row[colIndex];
      const len = cell === undefined || cell === null ? 0 : String(cell).length;
      return Math.max(acc, len);
    }, 8);
    return { wch: Math.min(Math.max(maxLen + 2, 10), 48) };
  });
  return widths ?? [];
}

export function buildReportsWorkbookBuffer(params: BuildReportsWorkbookParams): ArrayBuffer {
  const { filters, summary, byProfile, byUser, byProject, contractValuation, projectValuation, spendRows, includeValuation } =
    params;

  const resumenRows: (string | number)[][] = [
    ["Reporte de horas"],
    ["Desde", filters.from],
    ["Hasta", filters.to],
    ["Cliente", filters.clientLabel],
    ["Proyecto", filters.projectLabel],
    [],
    ["KPI", "Valor"],
    ["Horas totales", summary.totalHours.toFixed(2)],
    ["Personas activas", summary.activePeople],
    ["Proyectos con actividad", summary.activeProjects],
    ["Horas facturables", summary.billableHours.toFixed(2)],
    ["Horas no facturables", summary.nonBillableHours.toFixed(2)],
  ];

  const perfilRows: (string | number)[][] = [
    ["Perfil", "Horas", "% del total", "Personas", "Horas facturables"],
    ...byProfile.map((row) => [
      row.profileName,
      row.hours.toFixed(2),
      row.sharePercent.toFixed(1),
      row.distinctPeople,
      row.billableHours.toFixed(2),
    ]),
  ];

  const personaRows: (string | number)[][] = [
    ["Persona", "Perfil", "Horas", "% del total", "Categorías principales"],
    ...byUser.map((row) => [row.userName, row.profileName, row.hours.toFixed(2), row.sharePercent.toFixed(1), row.topCategories]),
  ];

  const proyectoRows: (string | number)[][] = [
    ["Código", "Proyecto", "Cliente", "Horas", "% del total", "REQs", "Personas"],
    ...byProject.map((row) => [
      row.projectCode,
      row.projectName,
      row.clientName,
      row.hours.toFixed(2),
      row.sharePercent.toFixed(1),
      row.requirementCount,
      row.distinctPeople,
    ]),
  ];

  const detalleRows: (string | number)[][] = [
    [
      "Cliente",
      "Contrato",
      "Persona",
      "Categoría",
      "Horas",
      "Facturable",
      "Costo CLP",
      "Venta CLP",
      "Margen CLP",
      "Margen %",
    ],
    ...spendRows.map((row) => [
      row.clientName,
      row.contractName,
      row.userName,
      row.categoryLabel,
      row.hours.toFixed(2),
      row.billable ? "Sí" : "No",
      row.amountClp ?? "",
      row.revenueClp ?? "",
      row.marginClp ?? "",
      row.marginPercentage ?? "",
    ]),
  ];

  const wb = XLSX.utils.book_new();

  const wsResumen = XLSX.utils.aoa_to_sheet(resumenRows);
  wsResumen["!cols"] = autoWidthSheet(resumenRows);
  XLSX.utils.book_append_sheet(wb, wsResumen, "Resumen");

  const wsPerfil = XLSX.utils.aoa_to_sheet(perfilRows);
  wsPerfil["!cols"] = autoWidthSheet(perfilRows);
  XLSX.utils.book_append_sheet(wb, wsPerfil, "PorPerfil");

  const wsPersona = XLSX.utils.aoa_to_sheet(personaRows);
  wsPersona["!cols"] = autoWidthSheet(personaRows);
  XLSX.utils.book_append_sheet(wb, wsPersona, "PorPersona");

  const wsProyecto = XLSX.utils.aoa_to_sheet(proyectoRows);
  wsProyecto["!cols"] = autoWidthSheet(proyectoRows);
  XLSX.utils.book_append_sheet(wb, wsProyecto, "PorProyecto");

  if (includeValuation) {
    const valorizacionRows: (string | number)[][] = [
      ["Tipo", "Código", "Nombre", "Cliente", "Proyecto", "Horas", "Costo CLP", "Markup %", "Venta CLP", "OPEX %", "OPEX CLP", "Margen CLP", "Margen %"],
      ...contractValuation.map((row) => [
        "Contrato",
        row.contractCode,
        row.contractName,
        row.clientName,
        row.projectName,
        row.hours.toFixed(2),
        row.costClp,
        row.markupPercentage,
        row.revenueClp,
        row.opexPercentage,
        row.opexAmountClp,
        row.marginClp,
        row.marginPercentage.toFixed(1),
      ]),
      ...projectValuation.map((row) => [
        "Proyecto",
        row.projectCode,
        row.projectName,
        row.clientName,
        "",
        row.hours.toFixed(2),
        row.costClp,
        "",
        row.revenueClp,
        "",
        row.opexAmountClp,
        row.marginClp,
        row.marginPercentage.toFixed(1),
      ]),
    ];
    const wsValorizacion = XLSX.utils.aoa_to_sheet(valorizacionRows);
    wsValorizacion["!cols"] = autoWidthSheet(valorizacionRows);
    XLSX.utils.book_append_sheet(wb, wsValorizacion, "Valorizacion");
  }

  const wsDetalle = XLSX.utils.aoa_to_sheet(detalleRows);
  wsDetalle["!cols"] = autoWidthSheet(detalleRows);
  XLSX.utils.book_append_sheet(wb, wsDetalle, "Detalle");

  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}

export function buildReportsWorkbookBlob(params: BuildReportsWorkbookParams): Blob {
  const buffer = buildReportsWorkbookBuffer(params);
  return new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
}
