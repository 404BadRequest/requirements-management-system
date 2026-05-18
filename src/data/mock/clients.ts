import type { Client } from "@/types/domain";
import { seedNow } from "@/data/mock/seed/timestamps";

export const clientsSeed: Client[] = [
  { id: "client-esval", name: "ESVAL", code: "ESVAL", active: true, createdAt: seedNow, updatedAt: seedNow },
  { id: "client-aguas-andinas", name: "Aguas Andinas", code: "AA", active: true, createdAt: seedNow, updatedAt: seedNow },
  { id: "client-aguas-valle", name: "Aguas del Valle", code: "ADV", active: true, createdAt: seedNow, updatedAt: seedNow },
  { id: "client-interno", name: "Cliente Interno", code: "INT", active: true, createdAt: seedNow, updatedAt: seedNow },
];
