import { timeEntryCategoryCodes } from "@/data/mock/settings-catalog-seed";
import { requirementsMock } from "@/data/mock/requirements";
import { calculateDurationMinutes } from "@/lib/calculations/time";
import type { TimeEntry } from "@/types/domain";

const users = ["user-julio", "user-luis", "user-veronica", "user-jacklin", "user-joaquin"];

const pad = (value: number): string => String(value).padStart(2, "0");

const getHourRange = (index: number): { startTime: string; endTime: string } => {
  const startHour = 8 + (index % 8);
  const startMinute = index % 2 === 0 ? 0 : 30;
  const lengthMinutes = [60, 90, 120, 150, 180][index % 5];
  const startTotal = startHour * 60 + startMinute;
  const endTotal = startTotal + lengthMinutes;
  return {
    startTime: `${pad(Math.floor(startTotal / 60))}:${pad(startTotal % 60)}`,
    endTime: `${pad(Math.floor(endTotal / 60))}:${pad(endTotal % 60)}`,
  };
};

export const timeEntriesMock: TimeEntry[] = Array.from({ length: 210 }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() - index);

  const { startTime, endTime } = getHourRange(index);
  const withoutRequirement = index % 7 === 0;
  const requirement = requirementsMock[index % requirementsMock.length];

  return {
    id: `time-${String(index + 1).padStart(3, "0")}`,
    projectId: "proj-main",
    requirementId: withoutRequirement ? null : requirement.id,
    contractId: null,
    category: timeEntryCategoryCodes[index % timeEntryCategoryCodes.length],
    taskDescription: withoutRequirement ? "Soporte operativo transversal" : `Trabajo sobre ${requirement.title}`,
    date: date.toISOString().slice(0, 10),
    startTime,
    endTime,
    durationMinutes: calculateDurationMinutes(startTime, endTime),
    userId: users[index % users.length],
    observations: index % 6 === 0 ? "Incluye coordinación interna." : "",
    createdAt: date.toISOString(),
    updatedAt: date.toISOString(),
  };
});
