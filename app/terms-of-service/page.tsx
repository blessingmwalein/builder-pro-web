import Link from "next/link";

export const metadata = {
  title: "Terms of Service — ownit2buildit",
  description: "The terms governing your use of ownit2buildit.",
};

export default function TermsOfServicePage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20 md:py-28">
      <Link
        href="/"
        className="mb-10 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        ← Back to home
      </Link>

      <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
        Terms of Service
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Last updated: June 2026
      </p>

      <div className="mt-10 flex flex-col gap-8 text-sm text-muted-foreground leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            1. Acceptance
          </h2>
          <p>
            By registering for or using ownit2buildit (&quot;the Service&quot;),
            you agree to be bound by these Terms of Service. If you are
            registering on behalf of a company, you confirm you have authority
            to bind that company.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            2. Description of Service
          </h2>
          <p>
            ownit2buildit is a cloud-based construction project management
            platform providing project tracking, budgeting, quoting, invoicing,
            team management, client portal, and related tools. Features vary by
            subscription plan.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            3. Accounts and access
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              You are responsible for maintaining the confidentiality of your
              login credentials.
            </li>
            <li>
              You must notify us immediately of any unauthorised access to your
              account.
            </li>
            <li>
              You may not share accounts or transfer access to unauthorised
              parties.
            </li>
            <li>Each user seat is for a single named individual.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            4. Subscription and billing
          </h2>
          <ul className="list-disc pl-5 flex flex-col gap-2">
            <li>
              Plans are priced per person per month. You are billed for the
              number of active users in your account.
            </li>
            <li>
              A 14-day free trial is available for new accounts. No payment
              information is required to start a trial.
            </li>
            <li>
              After the trial, a paid subscription is required to continue
              access. Unpaid accounts will be suspended after a grace period.
            </li>
            <li>
              Annual plans offer a discount equivalent to 2 months free. Annual
              fees are non-refundable except where required by applicable law.
            </li>
            <li>
              We reserve the right to change pricing with 30 days&apos; notice.
              Existing subscribers will be grandfathered at their current rate
              until their next renewal.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            5. Acceptable use
          </h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 mt-2 flex flex-col gap-2">
            <li>
              Use the Service for any unlawful purpose or in violation of any
              applicable regulations.
            </li>
            <li>
              Attempt to gain unauthorised access to any part of the Service or
              its infrastructure.
            </li>
            <li>
              Reverse-engineer, decompile, or reproduce any part of the Service.
            </li>
            <li>
              Upload content that is defamatory, harmful, or infringes third
              party intellectual property.
            </li>
            <li>
              Use automated scripts to scrape or overload the platform.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            6. Your data
          </h2>
          <p>
            You retain ownership of all data you upload to the platform. You
            grant us a limited licence to store and process that data solely to
            provide the Service. See our{" "}
            <Link href="/privacy-policy" className="text-primary hover:underline">
              Privacy Policy
            </Link>{" "}
            for full details.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            7. Intellectual property
          </h2>
          <p>
            All software, design, trademarks, and content forming the Service
            are owned by ownit2buildit or its licensors. Nothing in these Terms
            transfers any ownership to you.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            8. Availability and support
          </h2>
          <p>
            We aim for high availability but do not guarantee uninterrupted
            access. Planned maintenance will be communicated in advance where
            possible. Support is provided via WhatsApp and email during business
            hours.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            9. Limitation of liability
          </h2>
          <p>
            To the maximum extent permitted by law, ownit2buildit is not liable
            for indirect, incidental, or consequential damages arising from your
            use of the Service. Our total liability in any month shall not exceed
            the fees paid by you in that month.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            10. Termination
          </h2>
          <p>
            Either party may terminate at any time. Upon termination, your
            access ceases and your data is retained for 90 days to allow export,
            after which it is permanently deleted.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            11. Governing law
          </h2>
          <p>
            These Terms are governed by the laws of Zimbabwe. Any disputes shall
            be resolved in the courts of Zimbabwe.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-foreground mb-2">
            12. Contact
          </h2>
          <p>
            Questions about these Terms? Contact us at{" "}
            <a
              href="mailto:legal@ownit2buildit.com"
              className="text-primary hover:underline"
            >
              legal@ownit2buildit.com
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
