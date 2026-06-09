import * as XLSX from "xlsx";
import type { TimeEntry } from "@/types/domain";

export type TimeEntryExportRow = {
  categoryLabel: string;
  taskDescription: string;
  date: string;
  startTime: string;
  endTime: string;
  hoursUsed: number | null;
  assigneeName: string;
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
      hoursUsed: entry.endTime ? Math.round((entry.durationMinutes / 60) * 100) / 100 : null,
      assigneeName: input.userNameById.get(entry.userId) ?? entry.userId,
    }));
}

export function buildTimeEntriesWorkbookBuffer(rows: TimeEntryExportRow[]): ArrayBuffer {
  const sheetRows: (string | number)[][] = [
    ["Categoría", "Tarea", "Fecha", "Hora inicio", "Hora término", "Horas utilizadas", "Encargado"],
    ...rows.map((row) => [
      row.categoryLabel,
      row.taskDescription,
      row.date,
      row.startTime,
      row.endTime,
      row.hoursUsed ?? "",
      row.assigneeName,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!cols"] = autoWidthSheet(sheetRows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Horas");
  return XLSX.write(wb, { bookType: "xlsx", type: "array" });
}
