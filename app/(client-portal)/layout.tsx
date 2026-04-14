"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, FolderKanban, FileText, Receipt, FileBox, MessageSquare, LogOut } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth, useAppDispatch } from "@/lib/hooks";
import { logout } from "@/store/slices/authSlice";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2 } from "lucide-react";

const portalNav = [
  { label: "My Projects", href: "/portal", icon: FolderKanban },
  { label: "Quotes", href: "/portal/quotes", icon: FileText },
  { label: "Invoices", href: "/portal/invoices", icon: Receipt },
  { label: "Documents", href: "/portal/documents", icon: FileBox },
  { label: "Messages", href: "/portal/messages", icon: MessageSquare },
];

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const { isAuthenticated, isLoading, user, tenant } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.push("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAuthenticated) return null;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Building2 className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <p className="text-sm font-semibold">{tenant?.name || "Client Portal"}</p>
              <p className="text-[11px] text-muted-foreground">Client Portal</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarFallback className="bg-primary/10 text-primary text-xs">
                {user ? `${user.firstName[0]}${user.lastName[0]}` : "??"}
              </AvatarFallback>
            </Avatar>
            <span className="hidden text-sm font-medium sm:block">{user?.firstName}</span>
            <Button variant="ghost" size="sm" onClick={() => { dispatch(logout()); router.push("/login"); }}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="border-b bg-background">
        <div className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-6">
          {portalNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                pathname === item.href || (item.href !== "/portal" && pathname.startsWith(item.href))
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="mx-auto max-w-6xl px-6 py-6">{children}</main>
    </div>
  );
}
