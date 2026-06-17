import Link from "next/link";
import Image from "next/image";

const footerLinks = {
  Product: [
    { label: "Features", href: "#features" },
    { label: "Pricing", href: "#pricing" },
    { label: "How It Works", href: "#how-it-works" },
  ],
  Company: [
    { label: "About Us", href: "#" },
    { label: "Contact", href: "#" },
    { label: "Careers", href: "#" },
  ],
  Legal: [
    { label: "Privacy Policy", href: "/privacy-policy" },
    { label: "Terms of Service", href: "/terms-of-service" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-border bg-background py-12 md:py-16">
      <div className="mx-auto max-w-7xl px-6">
        <div className="grid gap-8 md:grid-cols-4">
          {/* Brand */}
          <div>
            <Link href="/" className="flex items-center">
              <Image
                src="/logo.png"
                alt="Ownit2Buildit"
                width={200}
                height={80}
                className="h-20 w-auto object-contain"
              />
            </Link>
            <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
              Construction project management, simplified. Built for you.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([heading, links]) => (
            <div key={heading}>
              <p className="text-sm font-semibold text-foreground mb-4">
                {heading}
              </p>
              <ul className="flex flex-col gap-2.5">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex flex-col items-center gap-4 border-t border-border pt-8 md:flex-row md:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; 2026 ownit2buildit. Built for you.
          </p>
          <p className="text-xs text-muted-foreground">
            All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
