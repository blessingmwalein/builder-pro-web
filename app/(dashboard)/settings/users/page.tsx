"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, UserPlus, Loader2 } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { User, Role, PaginatedResponse, InviteRequest } from "@/types";

export default function UsersSettingsPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({ email: "", firstName: "", lastName: "", phone: "", roleId: "" });

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      api.get<PaginatedResponse<User>>("/users", { page, limit: 20 }),
      api.get<Role[]>("/rbac/roles"),
    ]).then(([usersRes, rolesRes]) => {
      setUsers(usersRes.items);
      setTotalUsers(usersRes.meta.total);
      setRoles(rolesRes);
    }).catch(() => {}).finally(() => setIsLoading(false));
  }, [page]);

  async function handleInvite() {
    setInviting(true);
    try {
      await api.post("/auth/invite", inviteForm);
      setShowInvite(false);
      setInviteForm({ email: "", firstName: "", lastName: "", phone: "", roleId: "" });
      // Refresh list
      const res = await api.get<PaginatedResponse<User>>("/users", { page, limit: 20 });
      setUsers(res.items);
      setTotalUsers(res.meta.total);
    } catch { /* handled */ }
    setInviting(false);
  }

  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">{u.firstName[0]}{u.lastName[0]}</AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">{u.firstName} {u.lastName}</p>
            <p className="text-xs text-muted-foreground">{u.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "roles",
      header: "Roles",
      cell: (u) => (
        <div className="flex flex-wrap gap-1">
          {u.roles.map((r) => <Badge key={r.id} variant="secondary" className="text-[10px]">{r.name}</Badge>)}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => (
        <Badge variant={u.isActive ? "default" : "secondary"} className="text-xs">
          {u.isActive ? "Active" : "Inactive"}
        </Badge>
      ),
    },
    {
      key: "lastLogin",
      header: "Last Login",
      cell: (u) => <span className="text-sm text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}</span>,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Users & Invites" description="Manage team members and send invitations.">
        <Button variant="outline" onClick={() => router.push("/settings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => setShowInvite(true)}>
          <UserPlus className="mr-2 h-4 w-4" /> Invite User
        </Button>
      </PageHeader>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        page={page}
        totalPages={Math.ceil(totalUsers / 20)}
        onPageChange={setPage}
      />

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={setShowInvite}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite Team Member</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>First Name *</Label><Input value={inviteForm.firstName} onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })} /></div>
              <div className="space-y-2"><Label>Last Name *</Label><Input value={inviteForm.lastName} onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })} /></div>
            </div>
            <div className="space-y-2"><Label>Email *</Label><Input type="email" value={inviteForm.email} onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })} /></div>
            <div className="space-y-2"><Label>Phone</Label><Input value={inviteForm.phone} onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })} /></div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <Select value={inviteForm.roleId} onValueChange={(v: string | null) => setInviteForm({ ...inviteForm, roleId: v ?? "" })}>
                <SelectTrigger><SelectValue placeholder="Select role" /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
            <Button onClick={handleInvite} disabled={inviting || !inviteForm.email || !inviteForm.firstName || !inviteForm.roleId}>
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
