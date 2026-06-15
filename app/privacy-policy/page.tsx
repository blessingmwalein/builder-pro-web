import Link from "next/link";

export const metadata = {
  title: "Privacy Policy — ownit2buildit",
  description: "How ownit2buildit collects, uses, and protects your data.",
};

export default function PrivacyPolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Privacy Policy
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: June 2026
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            1. Who we are
          </h2>
          <p>
            ownit2buildit (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is a
            construction project management platform. We are committed to
            protecting the personal information of our users and the companies
            that use our platform.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            2. Information we collect
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              <strong className="text-foreground">Account information:</strong>{" "}
              Name, email address, phone number, and company details provided
              during registration.
            </li>
            <li>
              <strong className="text-foreground">Usage data:</strong> Pages
              visited, features used, and actions performed within the platform
              for analytics and product improvement.
            </li>
            <li>
              <strong className="text-foreground">Project data:</strong> Project
              details, tasks, budgets, quotes, invoices, and other content you
              create within the platform.
            </li>
            <li>
              <strong className="text-foreground">Payment information:</strong>{" "}
              We do not store card details. Payments are processed by Paynow and
              EcoCash. We retain payment reference numbers and subscription
              status.
            </li>
            <li>
              <strong className="text-foreground">Device & log data:</strong> IP
              address, browser type, and timestamps of requests for security
              purposes.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            3. How we use your information
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>To provide, operate, and maintain the platform.</li>
            <li>To process payments and manage subscriptions.</li>
            <li>
              To send transactional emails (account confirmation, invoices,
              subscription reminders).
            </li>
            <li>To respond to support inquiries.</li>
            <li>
              To improve the platform based on aggregate usage analytics.
            </li>
            <li>To comply with legal obligations.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            4. Data sharing
          </h2>
          <p>
            We do not sell your personal data. We share data only with:
          </p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-2">
            <li>
              Payment processors (Paynow, EcoCash) — solely to process
              transactions.
            </li>
            <li>
              Cloud infrastructure providers (hosting, database, file storage)
              under strict data processing agreements.
            </li>
            <li>
              Law enforcement where required by applicable law.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            5. Data retention
          </h2>
          <p>
            We retain your data for as long as your account is active or as
            needed to provide services. After account deletion, data is purged
            within 90 days, except where retention is required by law.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            6. Your rights
          </h2>
          <p>You have the right to:</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-2">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data.</li>
            <li>Request deletion of your account and data.</li>
            <li>Export your project data.</li>
          </ul>
          <p className="mt-2">
            To exercise any of these rights, contact us at{" "}
            <a
              href="mailto:privacy@ownit2buildit.com"
              className="text-primary hover:underline"
            >
              privacy@ownit2buildit.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            7. Security
          </h2>
          <p>
            We use industry-standard encryption (TLS in transit, AES-256 at
            rest), access controls, and regular security reviews to protect your
            data. No system is 100% secure; we encourage strong passwords and
            prompt reporting of any suspected breach.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            8. Cookies
          </h2>
          <p>
            We use essential cookies for authentication and session management.
            We do not use third-party advertising cookies.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            9. Changes to this policy
          </h2>
          <p>
            We may update this policy from time to time. Significant changes
            will be communicated by email or a prominent notice on the platform.
            Continued use after the effective date constitutes acceptance.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            10. Contact
          </h2>
          <p>
            Questions about this policy? Reach us at{" "}
            <a
              href="mailto:privacy@ownit2buildit.com"
              className="text-primary hover:underline"
            >
              privacy@ownit2buildit.com
            </a>{" "}
            or via WhatsApp at{" "}
            <a
              href="https://wa.me/263772273888"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              +263 77 227 3888
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
