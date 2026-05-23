"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Shield, Loader2, Users, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { Role } from "@/types";

const permissionGroups = [
  { group: "Projects",    keys: ["projects.*", "projects.view", "projects.create", "projects.delete"] },
  { group: "Tasks",       keys: ["tasks.*", "tasks.view", "tasks.complete", "tasks.assign"] },
  { group: "Timesheets",  keys: ["timesheets.*", "timesheets.view_own", "timesheets.view_all", "timesheets.approve"] },
  { group: "Materials",   keys: ["materials.*", "materials.view", "materials.log", "materials.manage_inventory"] },
  { group: "Quotes",      keys: ["quotes.*", "quotes.view", "quotes.create", "quotes.send", "quotes.approve"] },
  { group: "Invoices",    keys: ["invoices.*", "invoices.view", "invoices.create", "invoices.send", "invoices.mark_paid"] },
  { group: "Financials",  keys: ["financials.*", "financials.view"] },
  { group: "Employees",   keys: ["employees.*", "employees.manage"] },
  { group: "CRM",         keys: ["crm.*", "crm.view", "crm.manage"] },
  { group: "Settings",    keys: ["settings.*"] },
  { group: "Reports",     keys: ["reports.*", "reports.view"] },
  { group: "Messaging",   keys: ["messaging.*", "messaging.view", "messaging.send"] },
  { group: "Documents",   keys: ["documents.*", "documents.view", "documents.upload"] },
];

function getPermissionKeys(role: Role): string[] {
  return role.permissions?.map((p) => p.permission.key) ?? [];
}

function PermissionForm({
  selected,
  onChange,
}: {
  selected: string[];
  onChange: (keys: string[]) => void;
}) {
  function toggle(key: string) {
    onChange(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  function toggleGroup(keys: string[]) {
    const allOn = keys.every((k) => selected.includes(k));
    if (allOn) {
      onChange(selected.filter((k) => !keys.includes(k)));
    } else {
      const merged = Array.from(new Set([...selected, ...keys]));
      onChange(merged);
    }
  }

  return (
    <div className="space-y-4">
      {permissionGroups.map((group) => {
        const allOn = group.keys.every((k) => selected.includes(k));
        const someOn = group.keys.some((k) => selected.includes(k));
        return (
          <div key={group.group}>
            <button
              type="button"
              className="flex items-center gap-2 mb-1.5 w-full text-left"
              onClick={() => toggleGroup(group.keys)}
            >
              <Checkbox
                checked={allOn}
                data-state={someOn && !allOn ? "indeterminate" : allOn ? "checked" : "unchecked"}
                className="pointer-events-none"
              />
              <span className="text-xs font-semibold text-foreground uppercase tracking-wide">
                {group.group}
              </span>
            </button>
            <div className="ml-6 flex flex-wrap gap-x-4 gap-y-1.5">
              {group.keys.map((key) => (
                <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer select-none">
                  <Checkbox checked={selected.includes(key)} onCheckedChange={() => toggle(key)} />
                  <span className="text-muted-foreground">{key.split(".")[1] ?? key}</span>
                </label>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function RolesSettingsPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Create state
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPerms, setNewPerms] = useState<string[]>([]);

  // Edit state
  const [editTarget, setEditTarget] = useState<Role | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPerms, setEditPerms] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    api.get<Role[]>("/rbac/roles")
      .then(setRoles)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleCreate() {
    setCreating(true);
    try {
      const role = await api.post<Role>("/rbac/roles", {
        name: newName, description: newDesc, permissionKeys: newPerms,
      });
      setRoles((prev) => [...prev, role]);
      toast.success(`Role "${newName}" created`);
      setShowCreate(false);
      setNewName(""); setNewDesc(""); setNewPerms([]);
    } catch {
      toast.error("Failed to create role");
    }
    setCreating(false);
  }

  function openEdit(role: Role) {
    setEditTarget(role);
    setEditName(role.name);
    setEditDesc(role.description ?? "");
    setEditPerms(getPermissionKeys(role));
  }

  async function handleEdit() {
    if (!editTarget) return;
    setSaving(true);
    try {
      const updated = await api.put<Role>(`/rbac/roles/${editTarget.id}`, {
        name: editName,
        description: editDesc,
        permissionKeys: editPerms,
      });
      setRoles((prev) => prev.map((r) => r.id === updated.id ? updated : r));
      toast.success(`Role "${editName}" updated`);
      setEditTarget(null);
    } catch {
      toast.error("Failed to update role");
    }
    setSaving(false);
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.delete(`/rbac/roles/${deleteTarget.id}`);
      setRoles((prev) => prev.filter((r) => r.id !== deleteTarget.id));
      toast.success(`Role "${deleteTarget.name}" deleted`);
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete role");
    }
    setDeleting(false);
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Roles & Permissions" description="Configure access control for your team." />
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader title="Roles & Permissions" description="Configure access control for your team.">
        <Button variant="outline" onClick={() => router.push("/settings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <Button onClick={() => setShowCreate(true)}>
          <Plus className="mr-2 h-4 w-4" /> Create Role
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {roles.map((role) => {
          const permKeys = getPermissionKeys(role);
          const userCount = role._count?.userRoles ?? 0;
          return (
            <Card key={role.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 shrink-0 text-primary" />
                    {role.name}
                  </CardTitle>
                  <div className="flex items-center gap-1 shrink-0">
                    {role.isSystem && (
                      <Badge variant="secondary" className="text-[10px]">System</Badge>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-foreground"
                      onClick={() => openEdit(role)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    {!role.isSystem && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setDeleteTarget(role)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1 space-y-3">
                {role.description && (
                  <p className="text-xs text-muted-foreground">{role.description}</p>
                )}
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{userCount} {userCount === 1 ? "user" : "users"}</span>
                </div>
                <Separator />
                {permKeys.length === 0 ? (
                  <p className="text-xs text-muted-foreground italic">No permissions assigned</p>
                ) : (
                  <div className="flex flex-wrap gap-1">
                    {permKeys.slice(0, 6).map((key) => (
                      <Badge key={key} variant="outline" className="text-[10px]">{key}</Badge>
                    ))}
                    {permKeys.length > 6 && (
                      <Badge variant="outline" className="text-[10px] text-muted-foreground">
                        +{permKeys.length - 6} more
                      </Badge>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ── Create Role dialog ─────────────────────────────────────────── */}
      <Dialog open={showCreate} onOpenChange={(o) => { setShowCreate(o); if (!o) { setNewName(""); setNewDesc(""); setNewPerms([]); } }}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Role</DialogTitle>
            <DialogDescription>Define a role and assign the permissions it grants.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name *</Label>
              <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Finance Manager" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description of this role" rows={2} />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionForm selected={newPerms} onChange={setNewPerms} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName.trim()}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Edit Role dialog ───────────────────────────────────────────── */}
      <Dialog open={!!editTarget} onOpenChange={(o) => !o && setEditTarget(null)}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Role</DialogTitle>
            <DialogDescription>
              {editTarget?.isSystem
                ? "This is a system role. You can adjust its permissions but it cannot be deleted."
                : "Update this role's name, description, and permissions."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Role Name *</Label>
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g. Finance Manager"
                disabled={editTarget?.isSystem}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={editDesc}
                onChange={(e) => setEditDesc(e.target.value)}
                placeholder="Brief description of this role"
                rows={2}
                disabled={editTarget?.isSystem}
              />
            </div>
            <div className="space-y-2">
              <Label>Permissions</Label>
              <PermissionForm selected={editPerms} onChange={setEditPerms} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTarget(null)} disabled={saving}>Cancel</Button>
            <Button onClick={handleEdit} disabled={saving || !editName.trim()}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmation ────────────────────────────────────────── */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &quot;{deleteTarget?.name}&quot;?</AlertDialogTitle>
            <AlertDialogDescription>
              Users currently assigned this role will lose the permissions it grants.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDelete}
              disabled={deleting}
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete Role
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
