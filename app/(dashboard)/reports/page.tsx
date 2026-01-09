import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { UtilizationReport } from "@/components/utilization-report";

export default async function ReportsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
          Reports
        </h1>
        <p className="text-slate-500 dark:text-slate-400">
          Analyze team utilization and export data
        </p>
      </div>

      <UtilizationReport workspaceId={session.user.workspaceId} />
    </div>
  );
}

