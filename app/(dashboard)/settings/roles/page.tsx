"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Shield, Loader2, Users } from "lucide-react";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import type { Role } from "@/types";

const permissionGroups = [
  { group: "Projects", keys: ["projects.*", "projects.view", "projects.create", "projects.delete"] },
  { group: "Tasks", keys: ["tasks.*", "tasks.view", "tasks.complete", "tasks.assign"] },
  { group: "Timesheets", keys: ["timesheets.*", "timesheets.view_own", "timesheets.view_all", "timesheets.approve"] },
  { group: "Materials", keys: ["materials.*", "materials.log", "materials.manage_inventory"] },
  { group: "Quotes", keys: ["quotes.*", "quotes.view", "quotes.create", "quotes.send", "quotes.approve"] },
  { group: "Invoices", keys: ["invoices.*", "invoices.view", "invoices.create", "invoices.send", "invoices.mark_paid"] },
  { group: "Financials", keys: ["financials.*", "financials.view"] },
  { group: "Employees", keys: ["employees.*", "employees.manage"] },
  { group: "CRM", keys: ["crm.*", "crm.view", "crm.manage"] },
  { group: "Settings", keys: ["settings.*"] },
  { group: "Reports", keys: ["reports.*", "reports.view"] },
  { group: "Messaging", keys: ["messaging.*", "messaging.view", "messaging.send"] },
  { group: "Documents", keys: ["documents.*", "documents.view", "documents.upload"] },
];

function getPermissionKeys(role: Role): string[] {
  if (!role.permissions) return [];
  return role.permissions.map((p) => p.permission.key);
}

export default function RolesSettingsPage() {
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [selectedPerms, setSelectedPerms] = useState<string[]>([]);

  useEffect(() => {
    api.get<Role[]>("/rbac/roles")
      .then((res) => setRoles(res))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  function togglePerm(key: string) {
    setSelectedPerms((prev) => prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]);
  }

  async function handleCreate() {
    setCreating(true);
    try {
      const role = await api.post<Role>("/rbac/roles", { name: newName, description: newDesc, permissionKeys: selectedPerms });
      setRoles((prev) => [...prev, role]);
      setShowCreate(false);
      setNewName(""); setNewDesc(""); setSelectedPerms([]);
    } catch { /* handled */ }
    setCreating(false);
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
            <Card key={role.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary" />
                    {role.name}
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    {role.isSystem && <Badge variant="secondary" className="text-[10px]">System</Badge>}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {role.description && <p className="text-xs text-muted-foreground">{role.description}</p>}

                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Users className="h-3 w-3" />
                  <span>{userCount} {userCount === 1 ? "user" : "users"}</span>
                </div>

                <div className="flex flex-wrap gap-1">
                  {permKeys.slice(0, 5).map((key) => (
                    <Badge key={key} variant="outline" className="text-[10px]">{key}</Badge>
                  ))}
                  {permKeys.length > 5 && (
                    <Badge variant="outline" className="text-[10px]">+{permKeys.length - 5} more</Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Create Role dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Create New Role</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Role Name *</Label><Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Finance Manager" /></div>
            <div className="space-y-2"><Label>Description</Label><Textarea value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Brief description of this role" /></div>
            <div className="space-y-3">
              <Label>Permissions</Label>
              {permissionGroups.map((group) => (
                <div key={group.group} className="space-y-1">
                  <p className="text-xs font-semibold text-muted-foreground uppercase">{group.group}</p>
                  <div className="flex flex-wrap gap-2">
                    {group.keys.map((key) => (
                      <label key={key} className="flex items-center gap-1.5 text-xs cursor-pointer">
                        <Checkbox
                          checked={selectedPerms.includes(key)}
                          onCheckedChange={() => togglePerm(key)}
                        />
                        {key}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={creating || !newName}>
              {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Role
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
