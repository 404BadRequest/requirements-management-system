import type { TimeEntry } from "@/types/domain";

export const calculateDurationMinutes = (startTime: string, endTime: string | null): number => {
  if (!endTime) return 0;
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);

  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;

  return end - start;
};

export const validateEndTimeAfterStart = (startTime: string, endTime: string): boolean => {
  return calculateDurationMinutes(startTime, endTime) > 0;
};

export const groupHoursByPerson = (entries: TimeEntry[]): Record<string, number> => {
  return entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.userId] = (acc[entry.userId] ?? 0) + entry.durationMinutes;
    return acc;
  }, {});
};

export const groupHoursByCategory = (entries: TimeEntry[]): Record<string, number> => {
  return entries.reduce<Record<string, number>>((acc, entry) => {
    acc[entry.category] = (acc[entry.category] ?? 0) + entry.durationMinutes;
    return acc;
  }, {});
};

export const groupHoursByMonth = (entries: TimeEntry[]): Record<string, number> => {
  return entries.reduce<Record<string, number>>((acc, entry) => {
    const key = entry.date.slice(0, 7);
    acc[key] = (acc[key] ?? 0) + entry.durationMinutes;
    return acc;
  }, {});
};
