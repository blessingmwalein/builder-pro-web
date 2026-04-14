import { Building2 } from "lucide-react";

export default function AcceptInviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — branding (fixed, no scroll) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground p-10 relative overflow-hidden">
        {/* Decorative background waves */}
        <svg
          className="absolute inset-0 h-full w-full pointer-events-none"
          viewBox="0 0 560 900"
          fill="none"
          preserveAspectRatio="none"
        >
          <path
            d="M560 0 C560 0, 480 120, 420 280 C360 440, 280 520, 200 600 C120 680, 60 760, 0 900 L560 900 Z"
            fill="white"
            fillOpacity="0.06"
          />
          <path
            d="M560 100 C520 180, 460 300, 380 420 C300 540, 240 640, 560 900 Z"
            fill="white"
            fillOpacity="0.04"
          />
          <path
            d="M0 700 C60 650, 140 620, 180 680 C220 740, 160 800, 80 840 C40 860, 0 880, 0 900 Z"
            fill="white"
            fillOpacity="0.08"
          />
        </svg>

        <div className="relative z-10 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">ownit2buildit</span>
        </div>

        <div className="relative z-10 space-y-6">
          <h1 className="text-3xl font-bold leading-tight">
            You&apos;ve been invited to join{" "}
            <span className="text-white font-extrabold drop-shadow-sm">a team.</span>
          </h1>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed">
            Set your password to complete your account and start collaborating
            with your team on ownit2buildit.
          </p>
        </div>

        <p className="relative z-10 text-xs text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} ownit2buildit. Built for Zimbabwe &amp; Southern Africa.
        </p>
      </div>

      {/* Right panel — form (scrollable) */}
      <div className="relative flex-1 overflow-y-auto bg-background">
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
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
