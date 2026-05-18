import type { UsersRepository } from "@/data/contracts/users-contract";
import { usersMock } from "@/data/mock/users";
import type { User } from "@/types/domain";

const db: User[] = [...usersMock];

export class MockUsersRepository implements UsersRepository {
  async getAll(): Promise<User[]> {
    return [...db];
  }

  async update(id: string, input: Partial<User>): Promise<User | undefined> {
    const index = db.findIndex((item) => item.id === id);
    if (index === -1) return undefined;
    const updated: User = {
      ...db[index],
      ...input,
      updatedAt: new Date().toISOString(),
    };
    db[index] = updated;
    return updated;
  }

  async create(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User> {
    const now = new Date().toISOString();
    const created: User = {
      id: `user-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    db.push(created);
    return created;
  }

  async delete(id: string): Promise<boolean> {
    const index = db.findIndex((item) => item.id === id);
    if (index === -1) return false;
    db.splice(index, 1);
    return true;
  }
}
