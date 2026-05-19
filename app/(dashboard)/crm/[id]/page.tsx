"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Mail, Phone, MapPin, Pencil, Trash2, UserPlus, X, Check } from "lucide-react";
import { toast } from "sonner";
import { useAppDispatch, useAppSelector, useFormatCurrency } from "@/lib/hooks";
import { fetchClient, deleteClient } from "@/store/slices/crmSlice";
import { PageHeader } from "@/components/shared/page-header";
import { StatusBadge } from "@/components/shared/status-badge";
import { EditClientModal } from "@/components/crm/edit-client-modal";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import api from "@/lib/api";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface PortalUser {
  id: string;
  userId: string;
  canViewProgress: boolean;
  canApproveMilestones: boolean;
  canReviewInvoices: boolean;
  canSubmitChanges: boolean;
  canTrackPayments: boolean;
  user: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatarUrl?: string;
  };
}

export default function ClientDetailPage() {
  const router = useRouter();
  const params = useParams();
  const dispatch = useAppDispatch();
  const formatCurrency = useFormatCurrency();
  const { current: client } = useAppSelector((s) => s.crm);
  const clientId = params.id as string;
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Portal users state
  const [portalUsers, setPortalUsers] = useState<PortalUser[]>([]);
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUserId, setLinkUserId] = useState("");
  const [linkPerms, setLinkPerms] = useState({
    canViewProgress: true,
    canApproveMilestones: false,
    canReviewInvoices: false,
    canSubmitChanges: false,
    canTrackPayments: false,
  });
  const [linking, setLinking] = useState(false);

  const loadPortalUsers = useCallback(async () => {
    try {
      const data = await api.get<PortalUser[]>(`/crm/clients/${clientId}/portal-users`);
      setPortalUsers(data ?? []);
    } catch { /* silent */ }
  }, [clientId]);

  useEffect(() => {
    if (clientId) {
      dispatch(fetchClient(clientId));
      loadPortalUsers();
    }
  }, [dispatch, clientId, loadPortalUsers]);

  async function handleLinkUser() {
    if (!linkUserId.trim()) return;
    setLinking(true);
    try {
      await api.post(`/crm/clients/${clientId}/portal-users`, {
        userId: linkUserId.trim(),
        ...linkPerms,
      });
      toast.success("User linked to portal");
      setLinkOpen(false);
      setLinkUserId("");
      loadPortalUsers();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to link user");
    } finally {
      setLinking(false);
    }
  }

  async function handleRemovePortalUser(userId: string) {
    try {
      await api.delete(`/crm/clients/${clientId}/portal-users/${userId}`);
      toast.success("Portal access removed");
      loadPortalUsers();
    } catch {
      toast.error("Failed to remove access");
    }
  }

  async function handlePermissionToggle(userId: string, key: keyof Omit<PortalUser, "id" | "userId" | "user">, value: boolean) {
    const pu = portalUsers.find((p) => p.userId === userId);
    if (!pu) return;
    try {
      await api.patch(`/crm/clients/${clientId}/portal-users/${userId}`, { [key]: value });
      setPortalUsers((prev) => prev.map((p) => p.userId === userId ? { ...p, [key]: value } : p));
    } catch {
      toast.error("Failed to update permission");
    }
  }

  async function handleDelete() {
    if (!client) return;
    setDeleting(true);
    try {
      await dispatch(deleteClient(client.id)).unwrap();
      toast.success("Client deleted");
      router.push("/crm");
    } catch {
      toast.error("Failed to delete client");
    } finally {
      setDeleting(false);
    }
  }

  if (!client) {
    return <div className="space-y-6"><Skeleton className="h-10 w-64" /><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <PageHeader title={client.name}>
        <Button variant="outline" size="sm" onClick={() => router.push("/crm")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Badge variant="secondary">{client.clientType}</Badge>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="mr-2 h-4 w-4" /> Edit
        </Button>
        <AlertDialog>
          <AlertDialogTrigger
            render={
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive" />
            }
          >
            <Trash2 className="mr-2 h-4 w-4" /> Delete
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this client?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently remove <span className="font-medium">{client.name}</span> from your CRM.
                Associated projects, quotes and invoices will remain but will lose this client link.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} disabled={deleting}>
                {deleting ? "Deleting..." : "Delete"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </PageHeader>

      <EditClientModal
        open={editOpen}
        onOpenChange={setEditOpen}
        client={client}
      />

      {/* Contact card */}
      <Card>
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-6">
          <Avatar className="h-16 w-16">
            <AvatarFallback className="bg-primary/10 text-primary text-xl">
              {client.name.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <h2 className="text-lg font-semibold">{client.name}</h2>
            {client.contactPerson && <p className="text-sm text-muted-foreground">Contact: {client.contactPerson}</p>}
          </div>
          <div className="flex flex-col gap-2 text-sm">
            {client.email && <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{client.email}</div>}
            {client.phone && <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{client.phone}</div>}
            {client.address && <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-muted-foreground" />{client.address}</div>}
          </div>
        </CardContent>
      </Card>

      {/* Financials summary */}
      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Total Revenue</p>
            <p className="text-2xl font-bold">{formatCurrency(client.totalRevenue || 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="py-4">
            <p className="text-sm text-muted-foreground">Outstanding Balance</p>
            <p className={`text-2xl font-bold ${(client.outstandingBalance || 0) > 0 ? "text-destructive" : ""}`}>
              {formatCurrency(client.outstandingBalance || 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* History tabs */}
      <Tabs defaultValue="projects">
        <TabsList>
          <TabsTrigger value="projects">Projects ({client.projects?.length || 0})</TabsTrigger>
          <TabsTrigger value="quotes">Quotes ({client.quotes?.length || 0})</TabsTrigger>
          <TabsTrigger value="invoices">Invoices ({client.invoices?.length || 0})</TabsTrigger>
          <TabsTrigger value="portal">Portal Users ({portalUsers.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-4">
          <Card>
            <CardContent className="py-4">
              {client.projects && client.projects.length > 0 ? (
                <div className="space-y-2">
                  {client.projects.map((p) => (
                    <button
                      key={p.id}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50"
                      onClick={() => router.push(`/projects/${p.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{p.name}</p>
                        <p className="text-xs text-muted-foreground">{p.code}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No projects with this client.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quotes" className="mt-4">
          <Card>
            <CardContent className="py-4">
              {client.quotes && client.quotes.length > 0 ? (
                <div className="space-y-2">
                  {client.quotes.map((q) => (
                    <button
                      key={q.id}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50"
                      onClick={() => router.push(`/quotes/${q.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{q.title}</p>
                        <p className="text-xs text-muted-foreground">{q.referenceNumber}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(q.total)}</span>
                        <StatusBadge status={q.status} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No quotes for this client.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invoices" className="mt-4">
          <Card>
            <CardContent className="py-4">
              {client.invoices && client.invoices.length > 0 ? (
                <div className="space-y-2">
                  {client.invoices.map((inv) => (
                    <button
                      key={inv.id}
                      className="flex w-full items-center justify-between rounded-lg border p-3 text-left hover:bg-muted/50"
                      onClick={() => router.push(`/invoices/${inv.id}`)}
                    >
                      <div>
                        <p className="text-sm font-medium">{inv.invoiceNumber}</p>
                        <p className="text-xs text-muted-foreground">Due: {new Date(inv.dueDate).toLocaleDateString()}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold">{formatCurrency(inv.total)}</span>
                        <StatusBadge status={inv.status} />
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-sm text-muted-foreground">No invoices for this client.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="portal" className="mt-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Portal Access</CardTitle>
                <Button size="sm" onClick={() => setLinkOpen(true)}>
                  <UserPlus className="mr-1.5 h-3.5 w-3.5" />
                  Link User
                </Button>
              </div>
            </CardHeader>
            <CardContent className="py-2">
              {portalUsers.length === 0 ? (
                <p className="py-6 text-center text-sm text-muted-foreground">
                  No users linked to this client portal yet.
                </p>
              ) : (
                <div className="space-y-4">
                  {portalUsers.map((pu) => (
                    <div key={pu.id} className="rounded-lg border p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs bg-primary/10 text-primary">
                              {pu.user.firstName[0]}{pu.user.lastName[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{pu.user.firstName} {pu.user.lastName}</p>
                            <p className="text-xs text-muted-foreground">{pu.user.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive h-7 w-7 p-0"
                          onClick={() => handleRemovePortalUser(pu.userId)}
                        >
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        {(
                          [
                            { key: "canViewProgress", label: "View progress" },
                            { key: "canApproveMilestones", label: "Approve milestones" },
                            { key: "canReviewInvoices", label: "Review invoices" },
                            { key: "canSubmitChanges", label: "Submit changes" },
                            { key: "canTrackPayments", label: "Track payments" },
                          ] as const
                        ).map(({ key, label }) => (
                          <div key={key} className="flex items-center gap-2">
                            <Switch
                              checked={pu[key]}
                              onCheckedChange={(v) => handlePermissionToggle(pu.userId, key, v)}
                              id={`${pu.id}-${key}`}
                            />
                            <Label htmlFor={`${pu.id}-${key}`} className="text-xs cursor-pointer">
                              {label}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Link portal user dialog */}
      <Dialog open={linkOpen} onOpenChange={setLinkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Link User to Portal</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="link-user-id">User ID</Label>
              <Input
                id="link-user-id"
                placeholder="Paste employee user ID"
                value={linkUserId}
                onChange={(e) => setLinkUserId(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">Find the User ID from the Employees page.</p>
            </div>
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Permissions</p>
              <div className="space-y-2">
                {(
                  [
                    { key: "canViewProgress", label: "View progress" },
                    { key: "canApproveMilestones", label: "Approve milestones" },
                    { key: "canReviewInvoices", label: "Review invoices" },
                    { key: "canSubmitChanges", label: "Submit changes" },
                    { key: "canTrackPayments", label: "Track payments" },
                  ] as const
                ).map(({ key, label }) => (
                  <div key={key} className="flex items-center gap-2">
                    <Switch
                      checked={linkPerms[key]}
                      onCheckedChange={(v) => setLinkPerms((prev) => ({ ...prev, [key]: v }))}
                      id={`new-${key}`}
                    />
                    <Label htmlFor={`new-${key}`} className="text-sm cursor-pointer">{label}</Label>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLinkOpen(false)}>Cancel</Button>
            <Button onClick={handleLinkUser} disabled={!linkUserId.trim() || linking}>
              {linking ? "Linking..." : (
                <><Check className="mr-1.5 h-3.5 w-3.5" /> Link User</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Notes */}
      {client.notes && (
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm">Notes</CardTitle></CardHeader>
          <CardContent><p className="text-sm text-muted-foreground">{client.notes}</p></CardContent>
        </Card>
      )}
    </div>
  );
}
