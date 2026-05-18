import type { Client } from "@/types/domain";

export type ClientCreateInput = Omit<Client, "id" | "createdAt" | "updatedAt">;
export type ClientUpdateInput = Partial<Pick<Client, "name" | "code" | "active">>;

export interface ClientsRepository {
  getAll(): Promise<Client[]>;
  create(input: ClientCreateInput): Promise<Client>;
  update(id: string, input: ClientUpdateInput): Promise<Client | undefined>;
  delete(id: string): Promise<boolean>;
}
