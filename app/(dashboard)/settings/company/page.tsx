"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/hooks";
import api from "@/lib/api";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tenant } from "@/types";

export default function CompanySettingsPage() {
  const router = useRouter();
  const { tenant } = useAuth();
  const [form, setForm] = useState({ name: "", countryCode: "ZW", defaultCurrency: "USD", timezone: "Africa/Harare" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (tenant) {
      setForm({ name: tenant.name, countryCode: tenant.countryCode, defaultCurrency: tenant.defaultCurrency, timezone: tenant.timezone });
    }
  }, [tenant]);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch("/companies/me", form);
    } catch { /* handled */ }
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <PageHeader title="Company Settings" description="Update your company information.">
        <Button variant="outline" onClick={() => router.push("/settings")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </PageHeader>

      <Card>
        <CardHeader><CardTitle className="text-base">Company Details</CardTitle></CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label>Company Name</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label>Slug</Label>
            <Input value={tenant?.slug || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Account Type</Label>
            <Input value={tenant?.accountType || ""} disabled className="bg-muted" />
          </div>
          <div className="space-y-2">
            <Label>Default Currency</Label>
            <Select value={form.defaultCurrency} onValueChange={(v: string | null) => setForm({ ...form, defaultCurrency: v ?? "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="USD">USD</SelectItem>
                <SelectItem value="ZWG">ZWG</SelectItem>
                <SelectItem value="ZAR">ZAR</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Country</Label>
            <Select value={form.countryCode} onValueChange={(v: string | null) => setForm({ ...form, countryCode: v ?? "" })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="ZW">Zimbabwe</SelectItem>
                <SelectItem value="ZA">South Africa</SelectItem>
                <SelectItem value="ZM">Zambia</SelectItem>
                <SelectItem value="MW">Malawi</SelectItem>
                <SelectItem value="MZ">Mozambique</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Timezone</Label>
            <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save Changes
        </Button>
      </div>
    </div>
  );
}
