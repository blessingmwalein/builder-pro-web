"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { fetchProjects } from "@/store/slices/projectsSlice";
import { StatusBadge } from "@/components/shared/status-badge";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FolderKanban } from "lucide-react";

export default function ClientPortalHome() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items: projects, isLoading } = useAppSelector((s) => s.projects);

  useEffect(() => {
    dispatch(fetchProjects({ limit: 50 }));
  }, [dispatch]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">My Projects</h1>
        <p className="text-sm text-muted-foreground">Track the progress of your construction projects.</p>
      </div>

      {projects.length === 0 && !isLoading ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FolderKanban className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No projects assigned to you yet.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => router.push(`/portal/projects/${project.id}`)}
            >
              <CardContent className="py-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold">{project.name}</h3>
                    <p className="text-xs text-muted-foreground">{project.code}</p>
                  </div>
                  <StatusBadge status={project.status} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{project.completionPercent}%</span>
                  </div>
                  <Progress value={project.completionPercent} className="h-2" />
                </div>
                {project.description && (
                  <p className="mt-3 text-xs text-muted-foreground line-clamp-2">{project.description}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
