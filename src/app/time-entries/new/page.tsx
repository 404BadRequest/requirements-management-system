import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/rsc-guard";

export default async function NewTimeEntryPage() {
  await requirePermission("time_entries.write");
  redirect("/time-entries?nueva=1");
}
