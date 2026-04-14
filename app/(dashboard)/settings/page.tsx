"use client";

import { useRouter } from "next/navigation";
import { Building2, Users, Shield, CreditCard, User } from "lucide-react";
import { useAuth } from "@/lib/hooks";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const settingsLinks = [
  { title: "Company", description: "Update company name, logo, and details", icon: Building2, href: "/settings/company" },
  { title: "Users & Invites", description: "Manage team members and send invitations", icon: Users, href: "/settings/users" },
  { title: "Roles & Permissions", description: "Configure access control for your team", icon: Shield, href: "/settings/roles" },
  { title: "Subscription & Billing", description: "Manage your plan and payment method", icon: CreditCard, href: "/settings/subscription" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-3xl">
      <PageHeader title="Settings" description="Manage your account and company settings." />

      {/* Profile card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <User className="h-4 w-4" /> Profile
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 text-sm">
          <div><span className="text-muted-foreground">Name:</span> <span className="font-medium">{user?.firstName} {user?.lastName}</span></div>
          <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{user?.email}</span></div>
          <div><span className="text-muted-foreground">Phone:</span> <span className="font-medium">{user?.phone || "—"}</span></div>
          <div><span className="text-muted-foreground">Roles:</span> <span className="font-medium">{user?.roles?.map((r) => r.name).join(", ") || "—"}</span></div>
        </CardContent>
      </Card>

      {/* Settings navigation */}
      <div className="grid gap-4 sm:grid-cols-2">
        {settingsLinks.map((link) => (
          <Card
            key={link.href}
            className="cursor-pointer transition-all hover:shadow-md hover:border-primary/30"
            onClick={() => router.push(link.href)}
          >
            <CardContent className="flex items-center gap-4 py-5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <link.icon className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-sm">{link.title}</CardTitle>
                <CardDescription className="text-xs mt-0.5">{link.description}</CardDescription>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
