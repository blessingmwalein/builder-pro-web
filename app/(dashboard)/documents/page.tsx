"use client";

import { useEffect, useState } from "react";
import { FileBox, Upload, Download, File, Image, FileText as FileIcon, Trash2 } from "lucide-react";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchProjects } from "@/store/slices/projectsSlice";
import type { Document as Doc, PaginatedResponse, DocumentType } from "@/types";

const typeIcons: Record<string, React.ElementType> = {
  PLAN: FileIcon,
  PHOTO: Image,
  CONTRACT: FileIcon,
  REPORT: FileIcon,
  OTHER: File,
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DocumentsPage() {
  const dispatch = useAppDispatch();
  const { items: projects } = useAppSelector((s) => s.projects);
  const [documents, setDocuments] = useState<Doc[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [projectFilter, setProjectFilter] = useState<string>("");
  const [typeFilter, setTypeFilter] = useState<string>("");

  useEffect(() => {
    dispatch(fetchProjects({ limit: 100 }));
  }, [dispatch]);

  useEffect(() => {
    setIsLoading(true);
    const params: Record<string, string | number> = { page, limit: 20 };
    if (projectFilter) params.projectId = projectFilter;
    if (typeFilter) params.type = typeFilter;
    api.get<PaginatedResponse<Doc>>("/documents", params)
      .then((res) => { setDocuments(res.items); setTotalDocs(res.meta.total); })
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [page, projectFilter, typeFilter]);

  async function handleDownload(docId: string) {
    try {
      const res = await api.get<{ url: string }>(`/documents/${docId}/download-url`);
      window.open(res.url, "_blank");
    } catch { /* handled */ }
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Documents & Photos" description="Central file storage for all project documentation.">
        <Button>
          <Upload className="mr-2 h-4 w-4" /> Upload
        </Button>
      </PageHeader>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <Select value={projectFilter} onValueChange={(v: string | null) => { setProjectFilter(v === "ALL" ? "" : v ?? ""); setPage(1); }}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="All Projects" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Projects</SelectItem>
            {projects.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={(v: string | null) => { setTypeFilter(v === "ALL" ? "" : v ?? ""); setPage(1); }}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Types</SelectItem>
            <SelectItem value="PLAN">Plans</SelectItem>
            <SelectItem value="PHOTO">Photos</SelectItem>
            <SelectItem value="CONTRACT">Contracts</SelectItem>
            <SelectItem value="REPORT">Reports</SelectItem>
            <SelectItem value="OTHER">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : documents.length === 0 ? (
        <EmptyState
          icon={FileBox}
          title="No documents"
          description="Upload plans, photos, contracts, and other project files."
          actionLabel="Upload Document"
          onAction={() => {}}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {documents.map((doc) => {
            const Icon = typeIcons[doc.type] || File;
            return (
              <Card key={doc.id} className="hover:shadow-md transition-shadow">
                <CardContent className="flex items-center gap-4 py-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <Icon className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.fileName}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="secondary" className="text-[10px]">{doc.type}</Badge>
                      <span className="text-[11px] text-muted-foreground">{formatFileSize(doc.sizeBytes)}</span>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleDownload(doc.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Simple pagination */}
      {totalDocs > 20 && (
        <div className="flex justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="flex items-center px-3 text-sm text-muted-foreground">Page {page}</span>
          <Button variant="outline" size="sm" disabled={page * 20 >= totalDocs} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}
