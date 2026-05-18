import type { Profile } from "@/types/domain";

export type ProfileCreateInput = Omit<Profile, "id" | "createdAt" | "updatedAt">;
export type ProfileUpdateInput = Partial<
  Pick<Profile, "hourlyRate" | "rateCurrency" | "name" | "active">
>;

export interface ProfilesRepository {
  getAll(): Promise<Profile[]>;
  create(input: ProfileCreateInput): Promise<Profile>;
  update(id: string, input: ProfileUpdateInput): Promise<Profile | undefined>;
  delete(id: string): Promise<boolean>;
}
