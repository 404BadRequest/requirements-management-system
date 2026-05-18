import type { ClientsRepository, ClientCreateInput, ClientUpdateInput } from "@/data/contracts/clients-contract";
import { clientsSeed } from "@/data/mock/clients";
import type { Client } from "@/types/domain";

const db: Client[] = clientsSeed.map((c) => ({ ...c }));

export class MockClientsRepository implements ClientsRepository {
  async getAll(): Promise<Client[]> {
    return [...db].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }

  async create(input: ClientCreateInput): Promise<Client> {
    const now = new Date().toISOString();
    const created: Client = {
      id: `client-${crypto.randomUUID().slice(0, 8)}`,
      ...input,
      createdAt: now,
      updatedAt: now,
    };
    db.push(created);
    return created;
  }

  async update(id: string, input: ClientUpdateInput): Promise<Client | undefined> {
    const index = db.findIndex((c) => c.id === id);
    if (index === -1) return undefined;
    const next: Client = { ...db[index], ...input, updatedAt: new Date().toISOString() };
    db[index] = next;
    return next;
  }

  async delete(id: string): Promise<boolean> {
    const index = db.findIndex((c) => c.id === id);
    if (index === -1) return false;
    db.splice(index, 1);
    return true;
  }
}
