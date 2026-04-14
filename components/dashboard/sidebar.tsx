"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Clock,
  FileText,
  Receipt,
  DollarSign,
  Users,
  UserCircle,
  Package,
  MessageSquare,
  FileBox,
  BarChart3,
  Settings,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useHasAnyPermission } from "@/lib/hooks";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  permissions: string[];
}

const navSections: { title: string; items: NavItem[] }[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, permissions: [] },
    ],
  },
  {
    title: "Project Management",
    items: [
      { label: "Projects", href: "/projects", icon: FolderKanban, permissions: ["projects.*", "projects.view"] },
      { label: "Tasks", href: "/tasks", icon: CheckSquare, permissions: ["tasks.*", "tasks.view"] },
      { label: "Time Tracking", href: "/time-tracking", icon: Clock, permissions: ["timesheets.*", "timesheets.view_own"] },
    ],
  },
  {
    title: "Finance",
    items: [
      { label: "Quotes", href: "/quotes", icon: FileText, permissions: ["quotes.*", "quotes.view"] },
      { label: "Invoices", href: "/invoices", icon: Receipt, permissions: ["invoices.*", "invoices.view"] },
      { label: "Financials", href: "/financials", icon: DollarSign, permissions: ["financials.*", "financials.view"] },
    ],
  },
  {
    title: "Resources",
    items: [
      { label: "Clients", href: "/crm", icon: UserCircle, permissions: ["crm.*", "crm.view"] },
      { label: "Employees", href: "/employees", icon: Users, permissions: ["employees.*", "employees.manage"] },
      { label: "Materials", href: "/materials", icon: Package, permissions: ["materials.*", "materials.log"] },
    ],
  },
  {
    title: "Communication",
    items: [
      { label: "Messages", href: "/messaging", icon: MessageSquare, permissions: ["messaging.*", "messaging.view"] },
      { label: "Documents", href: "/documents", icon: FileBox, permissions: ["documents.*", "documents.view"] },
    ],
  },
  {
    title: "Insights",
    items: [
      { label: "Reports", href: "/reports", icon: BarChart3, permissions: ["reports.*", "reports.view"] },
    ],
  },
];

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const pathname = usePathname();

  const sidebarContent = (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-all duration-300",
        collapsed ? "w-[68px]" : "w-[260px]"
      )}
    >
      {/* Logo */}
      <div className="flex h-16 shrink-0 items-center gap-3 px-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
          <Building2 className="h-5 w-5 text-sidebar-primary-foreground" />
        </div>
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            ownit2buildit
          </span>
        )}
      </div>

      <Separator className="shrink-0 bg-sidebar-border" />

      {/* Scrollable nav */}
      <div className="flex-1 min-h-0 overflow-y-auto py-2">
        <nav className="space-y-1 px-2">
          {navSections.map((section) => (
            <SidebarSection
              key={section.title}
              section={section}
              collapsed={collapsed}
              pathname={pathname}
              onNavigate={onMobileClose}
            />
          ))}
        </nav>
      </div>

      <Separator className="shrink-0 bg-sidebar-border" />

      {/* Settings */}
      <div className="shrink-0 p-2">
        <NavLink
          item={{ label: "Settings", href: "/settings", icon: Settings, permissions: ["settings.*"] }}
          collapsed={collapsed}
          isActive={pathname.startsWith("/settings")}
          onNavigate={onMobileClose}
        />
      </div>

      {/* Collapse toggle — desktop only */}
      <div className="hidden lg:block shrink-0 border-t border-sidebar-border p-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onToggle}
          className="w-full justify-center text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>
    </aside>
  );

  return (
    <>
      {/* Desktop sidebar — fixed, always visible */}
      <div className="hidden lg:block h-screen shrink-0 border-r border-sidebar-border">
        {sidebarContent}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50"
            onClick={onMobileClose}
          />
          {/* Drawer */}
          <div className="relative h-full w-[260px] border-r border-sidebar-border shadow-xl">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}

// Mobile menu trigger — exported for use in Header
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={onClick}
      className="lg:hidden"
    >
      <Menu className="h-5 w-5" />
    </Button>
  );
}

function SidebarSection({
  section,
  collapsed,
  pathname,
  onNavigate,
}: {
  section: { title: string; items: NavItem[] };
  collapsed: boolean;
  pathname: string;
  onNavigate: () => void;
}) {
  const visibleItems = section.items.filter((item) => {
    if (item.permissions.length === 0) return true;
    return useHasAnyPermission(item.permissions);
  });

  if (visibleItems.length === 0) return null;

  return (
    <div className="py-1">
      {!collapsed && (
        <p className="mb-1 px-3 pt-2 text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
          {section.title}
        </p>
      )}
      {visibleItems.map((item) => (
        <NavLink
          key={item.href}
          item={item}
          collapsed={collapsed}
          isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
          onNavigate={onNavigate}
        />
      ))}
    </div>
  );
}

function NavLink({
  item,
  collapsed,
  isActive,
  onNavigate,
}: {
  item: NavItem;
  collapsed: boolean;
  isActive: boolean;
  onNavigate: () => void;
}) {
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      className={cn(
        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
        isActive
          ? "bg-sidebar-accent text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        collapsed && "justify-center px-2"
      )}
      title={collapsed ? item.label : undefined}
    >
      <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive && "text-sidebar-primary")} />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
}
