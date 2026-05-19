"use client";

import { useEffect, useState, useCallback } from "react";
import { CheckCircle, XCircle, Clock, Loader2, CheckSquare2 } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import api from "@/lib/api";

type ApprovalStatus = "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";

interface ApprovalStep {
  id: string;
  stepOrder: number;
  status: ApprovalStatus;
  comment?: string;
  decidedAt?: string;
  approver: { id: string; firstName: string; lastName: string };
}

interface ApprovalRequest {
  id: string;
  entityType: string;
  entityId: string;
  status: ApprovalStatus;
  notes?: string;
  createdAt: string;
  requestedBy: { id: string; firstName: string; lastName: string };
  steps: ApprovalStep[];
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  PROCUREMENT_PR: "Purchase Request",
  PROCUREMENT_PO: "Purchase Order",
  BUDGET: "Budget",
  DOCUMENT: "Document",
  STAGE: "Stage",
  CHANGE_REQUEST: "Change Request",
};

const STATUS_BADGE: Record<ApprovalStatus, string> = {
  PENDING: "default",
  APPROVED: "outline",
  REJECTED: "destructive",
  CANCELLED: "secondary",
};

export default function ApprovalsPage() {
  const [activeTab, setActiveTab] = useState<"pending" | "all">("pending");
  const [items, setItems] = useState<ApprovalRequest[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState("");

  // Decide dialog
  const [decideTarget, setDecideTarget] = useState<{ request: ApprovalRequest; step: ApprovalStep } | null>(null);
  const [decideComment, setDecideComment] = useState("");
  const [deciding, setDeciding] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const params: Record<string, string> = { limit: "50" };
      if (activeTab === "pending") params.myPending = "true";
      if (filterType) params.entityType = filterType;
      const res = await api.get<{ items: ApprovalRequest[] }>("/approvals", params);
      setItems(res.items ?? []);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, filterType]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleDecide(decision: "APPROVED" | "REJECTED") {
    if (!decideTarget) return;
    setDeciding(true);
    try {
      await api.post(`/approvals/${decideTarget.request.id}/steps/${decideTarget.step.id}/decide`, {
        decision,
        comment: decideComment || undefined,
      });
      toast.success(decision === "APPROVED" ? "Approved" : "Rejected");
      setDecideTarget(null);
      setDecideComment("");
      load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed");
    } finally {
      setDeciding(false);
    }
  }

  // Find the step pending the current user in each request
  function getPendingStep(ar: ApprovalRequest): ApprovalStep | undefined {
    return ar.steps.find((s) => s.status === "PENDING");
  }

  const grouped = items.reduce<Record<string, ApprovalRequest[]>>((acc, ar) => {
    const key = ar.entityType;
    if (!acc[key]) acc[key] = [];
    acc[key].push(ar);
    return acc;
  }, {});

  const entityTypes = Array.from(new Set(items.map((i) => i.entityType)));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Approvals"
        description="Review and decide on requests pending your approval."
      />

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "pending" | "all")}>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="pending">
              <Clock className="mr-1.5 h-3.5 w-3.5" />
              Pending My Approval
            </TabsTrigger>
            <TabsTrigger value="all">All Requests</TabsTrigger>
          </TabsList>

          <Select
            value={filterType || "ALL"}
            onValueChange={(v: string | null) => setFilterType(v === "ALL" || !v ? "" : v)}
          >
            <SelectTrigger className="w-52">
              <SelectValue placeholder="All types">
                {filterType ? ENTITY_TYPE_LABELS[filterType] ?? filterType : "All types"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All types</SelectItem>
              {Object.entries(ENTITY_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {["pending", "all"].map((tab) => (
          <TabsContent key={tab} value={tab} className="mt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : items.length === 0 ? (
              <EmptyState
                icon={CheckSquare2}
                title={tab === "pending" ? "No pending approvals" : "No approval requests yet"}
                description={
                  tab === "pending"
                    ? "You have nothing waiting for your review."
                    : "Approval requests created in this workspace will appear here."
                }
              />
            ) : (
              <div className="space-y-6">
                {(filterType ? [[filterType, grouped[filterType] ?? []]] as [string, ApprovalRequest[]][] : Object.entries(grouped) as [string, ApprovalRequest[]][]).map(([type, requests]) => (
                  <div key={type} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      {ENTITY_TYPE_LABELS[type] ?? type} ({requests.length})
                    </p>
                    {requests.map((ar) => {
                      const pendingStep = getPendingStep(ar);
                      return (
                        <Card key={ar.id}>
                          <CardContent className="py-3">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                              <div className="space-y-2">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <p className="text-sm font-semibold text-muted-foreground font-mono">{ar.entityId.slice(0, 8)}…</p>
                                  <Badge variant={STATUS_BADGE[ar.status] as any} className="text-[10px]">
                                    {ar.status}
                                  </Badge>
                                  <Badge variant="outline" className="text-[10px]">
                                    {ENTITY_TYPE_LABELS[ar.entityType] ?? ar.entityType}
                                  </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Requested by {ar.requestedBy?.firstName} {ar.requestedBy?.lastName} &nbsp;·&nbsp;
                                  {new Date(ar.createdAt).toLocaleDateString()}
                                </p>
                                {ar.notes && (
                                  <p className="text-xs text-muted-foreground italic">{ar.notes}</p>
                                )}
                                {/* Step chain */}
                                <div className="flex flex-wrap gap-2 pt-1">
                                  {ar.steps.map((step) => (
                                    <div key={step.id} className="flex items-center gap-1.5">
                                      {step.status === "APPROVED" ? (
                                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                      ) : step.status === "REJECTED" ? (
                                        <XCircle className="h-3.5 w-3.5 text-destructive" />
                                      ) : (
                                        <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                                      )}
                                      <span className="text-xs text-muted-foreground">
                                        {step.approver.firstName} {step.approver.lastName}
                                      </span>
                                      {step.comment && (
                                        <span className="text-xs italic text-muted-foreground">"{step.comment}"</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Action buttons — only on pending step */}
                              {ar.status === "PENDING" && pendingStep && (
                                <div className="flex shrink-0 gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="border-green-500 text-green-600 hover:bg-green-50"
                                    onClick={() => setDecideTarget({ request: ar, step: pendingStep })}
                                  >
                                    <CheckCircle className="mr-1.5 h-3.5 w-3.5" /> Review
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Decide Dialog */}
      <Dialog open={Boolean(decideTarget)} onOpenChange={(open) => { if (!open) { setDecideTarget(null); setDecideComment(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review Approval</DialogTitle>
          </DialogHeader>
          {decideTarget && (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
                <p><span className="font-medium">Type:</span> {ENTITY_TYPE_LABELS[decideTarget.request.entityType] ?? decideTarget.request.entityType}</p>
                <p><span className="font-medium">Requested by:</span> {decideTarget.request.requestedBy.firstName} {decideTarget.request.requestedBy.lastName}</p>
                {decideTarget.request.notes && <p><span className="font-medium">Notes:</span> {decideTarget.request.notes}</p>}
              </div>
              <div className="space-y-2">
                <Label>Comment (optional)</Label>
                <Textarea
                  rows={3}
                  value={decideComment}
                  onChange={(e) => setDecideComment(e.target.value)}
                  placeholder="Add a comment explaining your decision..."
                />
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setDecideTarget(null); setDecideComment(""); }} disabled={deciding}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => handleDecide("REJECTED")}
              disabled={deciding}
            >
              {deciding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
              Reject
            </Button>
            <Button
              onClick={() => handleDecide("APPROVED")}
              disabled={deciding}
            >
              {deciding ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
              Approve
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
