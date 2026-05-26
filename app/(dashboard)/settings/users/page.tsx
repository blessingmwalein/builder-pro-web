"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  UserPlus,
  Loader2,
  MoreHorizontal,
  Mail,
  ShieldOff,
  ShieldCheck,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { useAuth } from "@/lib/hooks";
import { useRequirePermission } from "@/lib/use-require-permission";
import { FEATURE_PERMS } from "@/lib/permissions";
import { PageHeader } from "@/components/shared/page-header";
import { DataTable, type Column } from "@/components/shared/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { User, Role, PaginatedResponse } from "@/types";

type PendingUser = User & { isInvitePending?: boolean };

function SearchableSelect({
  value, onChange, options, placeholder = "Search...", emptyText = "No results",
}: {
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; sublabel?: string }[];
  placeholder?: string;
  emptyText?: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 text-sm shadow-sm ring-offset-background focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
        {selected ? (
          <span className="truncate">{selected.label}</span>
        ) : (
          <span className="text-muted-foreground">{placeholder}</span>
        )}
        <ChevronDown className="ml-2 h-3.5 w-3.5 shrink-0 opacity-50" />
      </PopoverTrigger>
      <PopoverContent className="w-72 p-0" align="start">
        <Command>
          <CommandInput placeholder={placeholder} />
          <CommandList>
            <CommandEmpty>{emptyText}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.label}
                  onSelect={() => { onChange(opt.value); setOpen(false); }}
                >
                  <Check className={cn("mr-2 h-3.5 w-3.5 shrink-0", opt.value === value ? "opacity-100" : "opacity-0")} />
                  <div className="flex flex-col overflow-hidden">
                    <span className="truncate text-sm">{opt.label}</span>
                    {opt.sublabel && <span className="truncate text-xs text-muted-foreground">{opt.sublabel}</span>}
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export default function UsersSettingsPage() {
  useRequirePermission(FEATURE_PERMS.settingsUsers);
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState<PendingUser[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Invite form
  const [showInvite, setShowInvite] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    roleId: "",
  });
  const [inviteAsEmployee, setInviteAsEmployee] = useState(false);
  const [employeeForm, setEmployeeForm] = useState({
    jobTitle: "",
    employeeType: "FULL_TIME",
    hourlyRate: "",
    employeeCode: "",
  });

  // Edit form
  const [editTarget, setEditTarget] = useState<User | null>(null);
  const [editForm, setEditForm] = useState({ firstName: "", lastName: "", phone: "" });
  const [editRoleIds, setEditRoleIds] = useState<string[]>([]);
  const [editOriginalRoleIds, setEditOriginalRoleIds] = useState<string[]>([]);
  const [addRoleId, setAddRoleId] = useState("");
  const [editing, setEditing] = useState(false);

  // Row action loading
  const [actionUserId, setActionUserId] = useState<string | null>(null);

  async function loadUsers() {
    setIsLoading(true);
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api.get<PaginatedResponse<PendingUser>>("/users", { page, limit: 20 }),
        api.get<Role[]>("/rbac/roles"),
      ]);
      setUsers(usersRes.items);
      setTotalUsers(usersRes.meta.total);
      setRoles(rolesRes);
    } catch {
      toast.error("Failed to load users");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page]);

  const isOwner = Boolean(
    currentUser?.roles?.some((r) => r.name?.toLowerCase() === "owner")
  );

  function resetInviteForm() {
    setInviteForm({ email: "", firstName: "", lastName: "", phone: "", roleId: "" });
    setInviteAsEmployee(false);
    setEmployeeForm({ jobTitle: "", employeeType: "FULL_TIME", hourlyRate: "", employeeCode: "" });
  }

  async function handleInvite() {
    setInviting(true);
    try {
      const payload: Record<string, unknown> = { ...inviteForm };
      if (inviteAsEmployee && employeeForm.jobTitle && employeeForm.hourlyRate) {
        payload.createAsEmployee = true;
        payload.employeeJobTitle = employeeForm.jobTitle;
        payload.employeeType = employeeForm.employeeType;
        payload.employeeHourlyRate = parseFloat(employeeForm.hourlyRate);
        if (employeeForm.employeeCode) payload.employeeCode = employeeForm.employeeCode;
      }
      await api.post("/auth/invite", payload);
      toast.success(`Invite sent to ${inviteForm.email}`);
      setShowInvite(false);
      resetInviteForm();
      await loadUsers();
    } catch {
      toast.error("Failed to send invite");
    }
    setInviting(false);
  }

  function openEdit(u: User) {
    setEditTarget(u);
    setEditForm({ firstName: u.firstName, lastName: u.lastName, phone: u.phone ?? "" });
    const currentIds = u.roles.map((r) => r.id);
    setEditRoleIds(currentIds);
    setEditOriginalRoleIds(currentIds);
    setAddRoleId("");
  }

  function addRoleToEdit(roleId: string) {
    if (!roleId || editRoleIds.includes(roleId)) return;
    setEditRoleIds((prev) => [...prev, roleId]);
    setAddRoleId("");
  }

  function removeRoleFromEdit(roleId: string) {
    setEditRoleIds((prev) => prev.filter((id) => id !== roleId));
  }

  async function handleEditSave() {
    if (!editTarget) return;
    setEditing(true);
    try {
      await api.put(`/users/${editTarget.id}`, editForm);

      const toAdd = editRoleIds.filter((id) => !editOriginalRoleIds.includes(id));
      const toRemove = editOriginalRoleIds.filter((id) => !editRoleIds.includes(id));
      await Promise.all([
        ...toAdd.map((roleId) => api.post(`/rbac/users/${editTarget.id}/roles`, { roleId })),
        ...toRemove.map((roleId) => api.delete(`/rbac/users/${editTarget.id}/roles/${roleId}`)),
      ]);

      toast.success("User updated");
      setEditTarget(null);
      await loadUsers();
    } catch {
      toast.error("Failed to update user");
    } finally {
      setEditing(false);
    }
  }

  async function handleResendInvite(u: User) {
    setActionUserId(u.id);
    try {
      await api.post(`/auth/invite/${u.id}/resend`, {});
      toast.success(`Invite re-sent to ${u.email}`);
    } catch {
      toast.error("Failed to resend invite");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleDeactivate(u: User) {
    setActionUserId(u.id);
    try {
      await api.put(`/users/${u.id}/deactivate`, {});
      toast.success(`${u.firstName} has been blocked`);
      await loadUsers();
    } catch {
      toast.error("Failed to block user");
    } finally {
      setActionUserId(null);
    }
  }

  async function handleActivate(u: User) {
    setActionUserId(u.id);
    try {
      await api.put(`/users/${u.id}/activate`, {});
      toast.success(`${u.firstName} has been unblocked`);
      await loadUsers();
    } catch {
      toast.error("Failed to unblock user");
    } finally {
      setActionUserId(null);
    }
  }

  const columns: Column<PendingUser>[] = [
    {
      key: "name",
      header: "User",
      cell: (u) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="bg-primary/10 text-primary text-xs">
              {u.firstName[0]}
              {u.lastName[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="text-sm font-medium">
              {u.firstName} {u.lastName}
            </p>
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
          {u.roles.map((r) => (
            <Badge key={r.id} variant="secondary" className="text-[10px]">
              {r.name}
            </Badge>
          ))}
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      cell: (u) => {
        const pending = !u.isActive && !u.lastLoginAt;
        return (
          <Badge
            variant={u.isActive ? "default" : pending ? "outline" : "secondary"}
            className="text-xs"
          >
            {u.isActive ? "Active" : pending ? "Invite pending" : "Blocked"}
          </Badge>
        );
      },
    },
    {
      key: "lastLogin",
      header: "Last Login",
      cell: (u) => (
        <span className="text-sm text-muted-foreground">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      className: "w-10 text-right",
      cell: (u) => {
        const isSelf = u.id === currentUser?.id;
        const busy = actionUserId === u.id;
        const pending = !u.isActive && !u.lastLoginAt;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg hover:bg-muted"
              onClick={(e) => e.stopPropagation()}
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MoreHorizontal className="h-4 w-4" />
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(u)}>
                <Pencil className="mr-2 h-3.5 w-3.5" /> Edit
              </DropdownMenuItem>
              {pending && (
                <DropdownMenuItem onClick={() => handleResendInvite(u)}>
                  <Mail className="mr-2 h-3.5 w-3.5" /> Resend invite
                </DropdownMenuItem>
              )}
              {!isSelf && isOwner && (
                <>
                  <DropdownMenuSeparator />
                  {u.isActive ? (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => handleDeactivate(u)}
                    >
                      <ShieldOff className="mr-2 h-3.5 w-3.5" /> Block user
                    </DropdownMenuItem>
                  ) : (
                    <DropdownMenuItem onClick={() => handleActivate(u)}>
                      <ShieldCheck className="mr-2 h-3.5 w-3.5" /> Unblock user
                    </DropdownMenuItem>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
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

      <div className="flex items-start gap-3 rounded-lg border border-primary/20 bg-primary/5 p-4 text-sm">
        <UserPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="space-y-1">
          <p className="font-medium">Need more user seats than your plan allows?</p>
          <p className="text-muted-foreground">
            Your plan has a capped number of users. To add more teammates beyond that
            cap, please discuss with your account admin &mdash; we&rsquo;ll review and
            arrange an extended seat agreement for you.
          </p>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
        isLoading={isLoading}
        page={page}
        totalPages={Math.ceil(totalUsers / 20)}
        onPageChange={setPage}
      />

      {/* Invite dialog */}
      <Dialog open={showInvite} onOpenChange={(o) => { setShowInvite(o); if (!o) resetInviteForm(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite Team Member</DialogTitle>
            <DialogDescription>
              We&rsquo;ll email them an invite link valid for 7 days.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name *</Label>
                <Input
                  value={inviteForm.firstName}
                  onChange={(e) => setInviteForm({ ...inviteForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name *</Label>
                <Input
                  value={inviteForm.lastName}
                  onChange={(e) => setInviteForm({ ...inviteForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email *</Label>
              <Input
                type="email"
                value={inviteForm.email}
                onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={inviteForm.phone}
                onChange={(e) => setInviteForm({ ...inviteForm, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Role *</Label>
              <SearchableSelect
                value={inviteForm.roleId}
                onChange={(roleId) => {
                  const role = roles.find((r) => r.id === roleId);
                  setInviteForm({ ...inviteForm, roleId });
                  // Mirror role name into employee job title
                  if (role) setEmployeeForm((prev) => ({ ...prev, jobTitle: role.name }));
                }}
                options={roles.map((r) => ({ value: r.id, label: r.name, sublabel: r.description }))}
                placeholder="Search roles..."
                emptyText="No roles found"
              />
            </div>

            <Separator />

            {/* Employee section */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Also add as Employee</p>
                <p className="text-xs text-muted-foreground">Create an employee record and set their rates</p>
              </div>
              <Switch checked={inviteAsEmployee} onCheckedChange={setInviteAsEmployee} />
            </div>

            {inviteAsEmployee && (
              <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Job Title *</Label>
                    <Input
                      placeholder="e.g. Foreman"
                      value={employeeForm.jobTitle}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, jobTitle: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Employee Code</Label>
                    <Input
                      placeholder="EMP-001"
                      value={employeeForm.employeeCode}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, employeeCode: e.target.value })}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Employment Type *</Label>
                    <Select
                      value={employeeForm.employeeType}
                      onValueChange={(v: string | null) => setEmployeeForm({ ...employeeForm, employeeType: v ?? "FULL_TIME" })}
                    >
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="FULL_TIME">Full Time</SelectItem>
                        <SelectItem value="PART_TIME">Part Time</SelectItem>
                        <SelectItem value="SUBCONTRACTOR">Subcontractor</SelectItem>
                        <SelectItem value="CASUAL">Casual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Hourly Rate (USD) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={employeeForm.hourlyRate}
                      onChange={(e) => setEmployeeForm({ ...employeeForm, hourlyRate: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowInvite(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleInvite}
              disabled={
                inviting ||
                !inviteForm.email ||
                !inviteForm.firstName ||
                !inviteForm.roleId ||
                (inviteAsEmployee && (!employeeForm.jobTitle || !employeeForm.hourlyRate))
              }
            >
              {inviting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send Invite
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit dialog */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>
              Update {editTarget?.firstName}&apos;s profile and role assignments.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>First Name</Label>
                <Input
                  value={editForm.firstName}
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  value={editForm.lastName}
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input
                value={editForm.phone}
                onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
              />
            </div>

            {/* Role management */}
            <div className="space-y-2">
              <Label>Roles</Label>
              <div className="flex flex-wrap gap-1.5 min-h-[32px] rounded-md border bg-muted/30 px-3 py-2">
                {editRoleIds.length === 0 && (
                  <span className="text-xs text-muted-foreground self-center">No roles assigned</span>
                )}
                {editRoleIds.map((id) => {
                  const r = roles.find((ro) => ro.id === id);
                  return r ? (
                    <Badge key={id} variant="secondary" className="gap-1 pr-1 text-xs">
                      {r.name}
                      <button
                        type="button"
                        className="rounded-full hover:bg-muted ml-0.5"
                        onClick={() => removeRoleFromEdit(id)}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ) : null;
                })}
              </div>
              <div className="flex gap-2">
                <Select
                  value={addRoleId}
                  onValueChange={setAddRoleId}
                >
                  <SelectTrigger className="flex-1 text-sm">
                    <SelectValue placeholder="Add a role…" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles
                      .filter((r) => !editRoleIds.includes(r.id))
                      .map((r) => (
                        <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!addRoleId}
                  onClick={() => addRoleToEdit(addRoleId)}
                >
                  Add
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={editing}>
              Cancel
            </Button>
            <Button onClick={handleEditSave} disabled={editing}>
              {editing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
