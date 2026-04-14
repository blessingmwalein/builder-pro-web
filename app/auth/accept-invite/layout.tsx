import { Building2 } from "lucide-react";

export default function AcceptInviteLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left panel — branding (fixed, no scroll) */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[560px] shrink-0 flex-col justify-between bg-sidebar text-sidebar-foreground p-10">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-6 w-6 text-sidebar-primary-foreground" />
          </div>
          <span className="text-xl font-bold tracking-tight">ownit2buildit</span>
        </div>

        <div className="space-y-6">
          <h1 className="text-3xl font-bold leading-tight">
            You&apos;ve been invited to join{" "}
            <span className="text-sidebar-primary">a team.</span>
          </h1>
          <p className="text-sidebar-foreground/70 text-lg leading-relaxed">
            Set your password to complete your account and start collaborating
            with your team on ownit2buildit.
          </p>
        </div>

        <p className="text-xs text-sidebar-foreground/50">
          &copy; {new Date().getFullYear()} ownit2buildit. Built for Zimbabwe &amp; Southern Africa.
        </p>
      </div>

      {/* Right panel — form (scrollable) */}
      <div className="flex-1 overflow-y-auto">
        <div className="flex min-h-full items-center justify-center px-6 py-12">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
