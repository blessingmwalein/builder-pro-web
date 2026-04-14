import { Building2 } from "lucide-react";

function DecorativeWaves({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 560 900"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      preserveAspectRatio="none"
    >
      {/* Large flowing wave — top-right to bottom-left */}
      <path
        d="M560 0 C560 0, 480 120, 420 280 C360 440, 280 520, 200 600 C120 680, 60 760, 0 900 L560 900 Z"
        fill="white"
        fillOpacity="0.06"
      />
      {/* Smaller accent wave */}
      <path
        d="M560 100 C520 180, 460 300, 380 420 C300 540, 240 640, 560 900 Z"
        fill="white"
        fillOpacity="0.04"
      />
      {/* Bottom-left gray accent blob */}
      <path
        d="M0 700 C60 650, 140 620, 180 680 C220 740, 160 800, 80 840 C40 860, 0 880, 0 900 Z"
        fill="white"
        fillOpacity="0.08"
      />
      {/* Top-right subtle arc */}
      <path
        d="M400 0 C440 40, 500 100, 560 160 L560 0 Z"
        fill="white"
        fillOpacity="0.05"
      />
    </svg>
  );
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — branding (fixed, no scroll) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground p-10 relative overflow-hidden">
        {/* Decorative background shapes */}
        <DecorativeWaves className="absolute inset-0 h-full w-full pointer-events-none" />

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">ownit2buildit</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl font-bold leading-tight">
            Construction project management,{" "}
            <span className="text-white font-extrabold drop-shadow-sm">simplified.</span>
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
                <div className="h-1.5 w-1.5 rounded-full bg-white/80" />
                {feat}
              </div>
            ))}
          </div>
        </div>

        <p className="relative z-10 text-xs text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} ownit2buildit. Built for Zimbabwe &amp; Southern Africa.
        </p>
      </div>

      {/* Right panel — forms (scrollable) */}
      <div className="relative flex-1 overflow-y-auto bg-background">
        {/* Decorative corner shapes on the form side */}
        <svg
          className="absolute top-0 right-0 w-60 h-60 pointer-events-none opacity-[0.07]"
          viewBox="0 0 240 240"
          fill="none"
        >
          <path d="M240 0 C240 132, 132 240, 0 240 L240 240 Z" fill="currentColor" className="text-primary" />
        </svg>
        <svg
          className="absolute bottom-0 left-0 w-48 h-48 pointer-events-none opacity-[0.05]"
          viewBox="0 0 200 200"
          fill="none"
        >
          <path d="M0 200 C0 90, 90 0, 200 0 L0 0 Z" fill="currentColor" className="text-primary" />
        </svg>

        <div className="relative z-10 flex min-h-full items-center justify-center px-6 py-12">
          <div className="w-full max-w-lg">{children}</div>
        </div>
      </div>
    </div>
  );
}
