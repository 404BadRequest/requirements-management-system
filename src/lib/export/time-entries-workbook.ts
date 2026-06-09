import ExcelJS from "exceljs";
import type { TimeEntry } from "@/types/domain";
import { EXPORT_BRAND } from "@/lib/export/export-brand";

export type TimeEntryExportRow = {
  categoryLabel: string;
  taskDescription: string;
  date: string;
  startTime: string;
  endTime: string;
  durationHms: string;
  hoursUsed: number | null;
  assigneeName: string;
};

const HEADERS = [
  "Categoría",
  "Tarea",
  "Fecha",
  "Hora inicio",
  "Hora término",
  "Duración",
  "Horas utilizadas",
  "Encargado",
] as const;

export function formatDurationAsHms(totalMinutes: number): string {
  const totalSeconds = Math.round(totalMinutes * 60);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

export function mapTimeEntriesForExport(
  entries: TimeEntry[],
  input: {
    categoryLabelByCode: Map<string, string>;
    userNameById: Map<string, string>;
  },
): TimeEntryExportRow[] {
  return [...entries]
    .sort((a, b) => {
      const byDate = a.date.localeCompare(b.date);
      if (byDate !== 0) return byDate;
      return a.startTime.localeCompare(b.startTime);
    })
    .map((entry) => ({
      categoryLabel: input.categoryLabelByCode.get(entry.category) ?? entry.category,
      taskDescription: entry.taskDescription,
      date: entry.date,
      startTime: entry.startTime,
      endTime: entry.endTime ?? "",
      durationHms: entry.endTime ? formatDurationAsHms(entry.durationMinutes) : "",
      hoursUsed: entry.endTime ? Math.round((entry.durationMinutes / 60) * 100) / 100 : null,
      assigneeName: input.userNameById.get(entry.userId) ?? entry.userId,
    }));
}

function styleHeaderRow(sheet: ExcelJS.Worksheet) {
  const headerRow = sheet.getRow(1);
  headerRow.height = 22;
  headerRow.eachCell((cell) => {
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: EXPORT_BRAND.headerBackgroundArgb },
    };
    cell.font = {
      bold: true,
      color: { argb: EXPORT_BRAND.headerForegroundArgb },
    };
    cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };
    cell.border = {
      top: { style: "thin", color: { argb: EXPORT_BRAND.headerBackgroundArgb } },
      left: { style: "thin", color: { argb: EXPORT_BRAND.headerBackgroundArgb } },
      bottom: { style: "thin", color: { argb: EXPORT_BRAND.headerBackgroundArgb } },
      right: { style: "thin", color: { argb: EXPORT_BRAND.headerBackgroundArgb } },
    };
  });
}

export async function buildTimeEntriesWorkbookBuffer(rows: TimeEntryExportRow[]): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "RMS";
  const sheet = workbook.addWorksheet("Horas");

  sheet.addRow([...HEADERS]);
  styleHeaderRow(sheet);

  for (const row of rows) {
    const dataRow = sheet.addRow([
      row.categoryLabel,
      row.taskDescription,
      row.date,
      row.startTime,
      row.endTime,
      row.durationHms,
      row.hoursUsed ?? "",
      row.assigneeName,
    ]);
    dataRow.alignment = { vertical: "top", wrapText: true };
    const hoursCell = dataRow.getCell(7);
    if (typeof row.hoursUsed === "number") {
      hoursCell.numFmt = "0.00";
    }
  }

  sheet.columns = [
    { width: 18 },
    { width: 42 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 12 },
    { width: 14 },
    { width: 22 },
  ];

  sheet.views = [{ state: "frozen", ySplit: 1 }];

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}
