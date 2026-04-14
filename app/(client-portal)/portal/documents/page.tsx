"use client";

import { useEffect, useState } from "react";
import { FileBox, Download, File, Image, FileText } from "lucide-react";
import api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Document as Doc, PaginatedResponse } from "@/types";

const typeIcons: Record<string, React.ElementType> = { PLAN: FileText, PHOTO: Image, CONTRACT: FileText, REPORT: FileText, OTHER: File };

export default function ClientDocumentsPage() {
  const [documents, setDocuments] = useState<Doc[]>([]);

  useEffect(() => {
    api.get<PaginatedResponse<Doc>>("/documents", { limit: 50 })
      .then((res) => setDocuments(res.items))
      .catch(() => {});
  }, []);

  async function handleDownload(docId: string) {
    try {
      const res = await api.get<{ url: string }>(`/documents/${docId}/download-url`);
      window.open(res.url, "_blank");
    } catch { /* handled */ }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Documents</h1>
        <p className="text-sm text-muted-foreground">Project plans, photos, and shared files.</p>
      </div>

      {documents.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center py-12">
            <FileBox className="h-10 w-10 text-muted-foreground/40 mb-2" />
            <p className="text-sm text-muted-foreground">No documents shared yet.</p>
          </CardContent>
        </Card>
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
                      <span className="text-[11px] text-muted-foreground">{new Date(doc.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => handleDownload(doc.id)}>
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
