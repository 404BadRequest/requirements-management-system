import type { TimeEntry } from "@/types/domain";
import type { TimeEntryInput } from "@/schemas/time-entry-schema";

export interface TimeEntriesRepository {
  getAll(): Promise<TimeEntry[]>;
  getById(id: string): Promise<TimeEntry | undefined>;
  create(input: TimeEntryInput): Promise<TimeEntry>;
  update(id: string, input: Partial<TimeEntryInput>): Promise<TimeEntry | undefined>;
  delete(id: string): Promise<boolean>;
}
