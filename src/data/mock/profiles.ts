import type { Profile } from "@/types/domain";
import { seedNow } from "@/data/mock/seed/timestamps";

export const profilesMock: Profile[] = [
  {
    id: "profile-director",
    name: "Director",
    hourlyRate: 125_000,
    rateCurrency: "CLP",
    active: true,
    createdAt: seedNow,
    updatedAt: seedNow,
  },
  {
    id: "profile-senior",
    name: "Ingeniero senior",
    hourlyRate: 92_000,
    rateCurrency: "CLP",
    active: true,
    createdAt: seedNow,
    updatedAt: seedNow,
  },
  {
    id: "profile-engineer",
    name: "Ingeniero",
    hourlyRate: 72_000,
    rateCurrency: "CLP",
    active: true,
    createdAt: seedNow,
    updatedAt: seedNow,
  },
  {
    id: "profile-junior",
    name: "Ingeniero junior",
    hourlyRate: 48_000,
    rateCurrency: "CLP",
    active: true,
    createdAt: seedNow,
    updatedAt: seedNow,
  },
];
