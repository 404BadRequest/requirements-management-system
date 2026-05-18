import type { ProfilesRepository, ProfileCreateInput, ProfileUpdateInput } from "@/data/contracts/profiles-contract";
import { profilesMock } from "@/data/mock/profiles";
import type { Profile } from "@/types/domain";

const db: Profile[] = profilesMock.map((profile) => ({ ...profile }));

export class MockProfilesRepository implements ProfilesRepository {
  async getAll(): Promise<Profile[]> {
    return [...db];
  }

  async create(input: ProfileCreateInput): Promise<Profile> {
    const now = new Date().toISOString();
    const created: Profile = {
      id: `profile-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    db.push(created);
    return created;
  }

  async update(id: string, input: ProfileUpdateInput): Promise<Profile | undefined> {
    const index = db.findIndex((p) => p.id === id);
    if (index === -1) return undefined;
    const next: Profile = { ...db[index], ...input, updatedAt: new Date().toISOString() };
    db[index] = next;
    return next;
  }

  async delete(id: string): Promise<boolean> {
    const index = db.findIndex((p) => p.id === id);
    if (index === -1) return false;
    db.splice(index, 1);
    return true;
  }
}
