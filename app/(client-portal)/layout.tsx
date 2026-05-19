"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Building2, FolderKanban, FileText, Receipt, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { clearAuth } from "@/lib/api";

// Routes under /portal/quotes/[id] are public — the page itself validates the sig.
function isPublicQuoteRoute(pathname: string): boolean {
  return /^\/portal\/quotes\/[^/]+$/.test(pathname);
}

export default function ClientPortalLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  const isLoginPage = pathname === "/portal/login";
  const isPublicQuote = isPublicQuoteRoute(pathname);

  useEffect(() => {
    if (isLoginPage || isPublicQuote) {
      setChecked(true);
      return;
    }
    const token = typeof window !== "undefined" ? localStorage.getItem("bp_access_token") : null;
    if (!token) {
      router.replace("/portal/login");
    } else {
      setChecked(true);
    }
  }, [router, isLoginPage, isPublicQuote]);

  function handleSignOut() {
    clearAuth();
    router.push("/portal/login");
  }

  if (!checked) return null;

  if (isLoginPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
        {children}
      </div>
    );
  }

  if (isPublicQuote) {
    return (
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="mx-auto max-w-3xl px-4">
            <div className="flex h-14 items-center">
              <div className="flex items-center gap-2.5">
                <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                  <Building2 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-sm tracking-tight">Client Portal</span>
              </div>
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-3xl px-4 py-8">
          {children}
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex h-14 items-center justify-between">
            <Link href="/portal" className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-md bg-primary">
                <Building2 className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="font-semibold text-sm tracking-tight">Client Portal</span>
            </Link>

            <nav className="hidden sm:flex items-center gap-0.5 text-sm">
              <Link
                href="/portal"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <FolderKanban className="h-3.5 w-3.5" />
                Projects
              </Link>
              <Link
                href="/portal/quotes"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <FileText className="h-3.5 w-3.5" />
                Quotes
              </Link>
              <Link
                href="/portal/invoices"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
              >
                <Receipt className="h-3.5 w-3.5" />
                Invoices
              </Link>
            </nav>

            <Button variant="ghost" size="sm" onClick={handleSignOut} className="text-muted-foreground">
              <LogOut className="mr-1.5 h-3.5 w-3.5" />
              Sign out
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8">
        {children}
      </main>
    </div>
  );
}
