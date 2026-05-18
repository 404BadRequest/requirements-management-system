import type { User } from "@/types/domain";

export interface UsersRepository {
  getAll(): Promise<User[]>;
  update(id: string, input: Partial<User>): Promise<User | undefined>;
  create(input: Omit<User, "id" | "createdAt" | "updatedAt">): Promise<User>;
  delete(id: string): Promise<boolean>;
}
