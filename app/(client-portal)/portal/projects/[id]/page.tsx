"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchProjectDashboard } from "@/store/slices/projectsSlice";
import { StatsCard } from "@/components/shared/stats-card";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { CheckSquare, DollarSign, Calendar, Clock } from "lucide-react";

export default function ClientProjectPage() {
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { dashboard } = useAppSelector((s) => s.projects);
  const projectId = params.id as string;

  useEffect(() => {
    if (projectId) dispatch(fetchProjectDashboard(projectId));
  }, [dispatch, projectId]);

  if (!dashboard) {
    return <div className="space-y-4"><Skeleton className="h-10 w-64" /><div className="grid gap-4 sm:grid-cols-3">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28" />)}</div></div>;
  }

  const { project, taskCounts, budgetUtilisation, timeline } = dashboard;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="text-sm text-muted-foreground">{project.code} — {project.projectType}</p>
        </div>
        <StatusBadge status={project.status} />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatsCard title="Completion" value={`${project.completionPercent}%`} icon={CheckSquare} subtitle={`${taskCounts.done}/${taskCounts.total} tasks`} />
        <StatsCard title="Timeline" value={`${timeline.daysElapsed} days`} icon={Calendar} subtitle={`of ${timeline.totalDays} total`} />
        <StatsCard title="Budget" value={`${budgetUtilisation.percentUsed}%`} icon={DollarSign} subtitle="utilised" />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Project Progress</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Overall</span><span className="font-semibold">{project.completionPercent}%</span></div>
            <Progress value={project.completionPercent} className="h-3" />
          </div>
          <div>
            <div className="flex justify-between text-sm mb-1"><span>Timeline</span><span className="font-semibold">{Math.round((timeline.daysElapsed / timeline.totalDays) * 100)}%</span></div>
            <Progress value={(timeline.daysElapsed / timeline.totalDays) * 100} className="h-3" />
          </div>
          <div className="grid grid-cols-4 gap-3 pt-2">
            {[
              { label: "To Do", count: taskCounts.todo, color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300" },
              { label: "Active", count: taskCounts.inProgress, color: "bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-400" },
              { label: "Blocked", count: taskCounts.blocked, color: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400" },
              { label: "Done", count: taskCounts.done, color: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400" },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg p-3 text-center ${s.color}`}>
                <p className="text-lg font-bold">{s.count}</p>
                <p className="text-[10px] font-medium">{s.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {project.description && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Scope of Work</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{project.description}</p></CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="grid gap-4 sm:grid-cols-2 py-4 text-sm">
          <div><span className="text-muted-foreground">Site Address:</span> <span className="font-medium">{project.siteAddress || "—"}</span></div>
          <div><span className="text-muted-foreground">Start Date:</span> <span className="font-medium">{new Date(project.startDate).toLocaleDateString()}</span></div>
          <div><span className="text-muted-foreground">End Date:</span> <span className="font-medium">{project.endDate ? new Date(project.endDate).toLocaleDateString() : "TBD"}</span></div>
          <div><span className="text-muted-foreground">Project Type:</span> <span className="font-medium">{project.projectType}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
