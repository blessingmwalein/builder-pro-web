import { Building2 } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — branding (fixed, no scroll) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">BuilderPro</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-tight">
            Construction project management,{" "}
            <span className="text-sidebar-primary">simplified.</span>
          </h1>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed">
            Manage projects, track budgets, coordinate teams, and keep clients
            in the loop — all from one platform built for the construction
            industry.
          </p>
          <div className="grid grid-cols-2 gap-4 pt-4">
            {[
              "Project Tracking",
              "Budget Control",
              "Time Management",
              "Quote & Invoice",
              "Team Coordination",
              "Client Portal",
            ].map((feat) => (
              <div key={feat} className="flex items-center gap-2 text-sm text-sidebar-foreground/80">
                <div className="h-1.5 w-1.5 rounded-full bg-sidebar-primary" />
                {feat}
              </div>
            ))}
          </div>
        </div>

        <p className="text-xs text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} BuilderPro. Built for Zimbabwe &amp; Southern Africa.
        </p>
      </div>

      {/* Right panel — forms (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}
