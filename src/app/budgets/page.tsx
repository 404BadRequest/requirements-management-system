import { AppShell } from "@/components/layout/app-shell";
import { requirePermission } from "@/lib/auth/rsc-guard";
import { roleHasPermission } from "@/lib/auth/permissions";
import { BudgetsPageClient } from "@/app/budgets/budgets-page-client";

export default async function BudgetsPage() {
  const user = await requirePermission("budgets.read");
  const canWrite = roleHasPermission(user.role, "budgets.write");
  const canExport = roleHasPermission(user.role, "exports.run");

  return (
    <AppShell>
      <BudgetsPageClient canWrite={canWrite} canExport={canExport} />
    </AppShell>
  );
}
