import type { TimeEntriesRepository } from "@/data/contracts/time-entries-contract";
import { timeEntriesMock } from "@/data/mock/time-entries";
import { calculateDurationMinutes } from "@/lib/calculations/time";
import type { TimeEntry } from "@/types/domain";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";

const db: TimeEntry[] = [...timeEntriesMock];

export class MockTimeEntriesRepository implements TimeEntriesRepository {
  async getAll(): Promise<TimeEntry[]> {
    return [...db];
  }

  async getById(id: string): Promise<TimeEntry | undefined> {
    const item = db.find((e) => e.id === id);
    return item ? { ...item } : undefined;
  }

  async create(input: TimeEntryInput): Promise<TimeEntry> {
    const now = new Date().toISOString();
    const duration = calculateDurationMinutes(input.startTime, input.endTime);
    const created: TimeEntry = {
      id: `time-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      observations: input.observations ?? "",
      durationMinutes: duration,
      createdAt: now,
      updatedAt: now,
    };
    db.unshift(created);
    return created;
  }

  async update(id: string, input: Partial<TimeEntryInput>): Promise<TimeEntry | undefined> {
    const index = db.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const current = db[index];
    const start = input.startTime ?? current.startTime;
    const end = input.endTime === undefined ? current.endTime : input.endTime;
    const updated: TimeEntry = {
      ...current,
      ...input,
      durationMinutes: calculateDurationMinutes(start, end),
      updatedAt: new Date().toISOString(),
    };
    db[index] = updated;
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    const index = db.findIndex((item) => item.id === id);
    if (index === -1) return false;
    db.splice(index, 1);
    return true;
  }
}
