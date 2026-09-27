import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Service" updated="September 27, 2026">
      <p>
        These terms cover your use of WorkWorth (<a href="https://workworth.de">workworth.de</a>),
        operated by Michael Darbyshire (see the <a href="/impressum">Impressum</a>).
        By creating an account, you agree to them.
      </p>

      <h2>What WorkWorth is</h2>
      <p>
        WorkWorth helps a small service business track jobs, time and
        expenses, and see what each job actually made. It is currently in
        beta: features are still being built, and things may change or break.
      </p>

      <h2>Your account</h2>
      <p>
        You&apos;re responsible for the accuracy of what you tell us and for
        keeping your password secure. In v1, an account belongs to exactly
        one business. You must be old enough to enter into a contract in your
        own jurisdiction.
      </p>

      <h2>The free plan</h2>
      <p>
        Free for up to two people, no trial period and no card required. A
        paid plan with more seats and more features is planned but not
        available yet — the waitlist link in Settings is exactly that, a
        waitlist, not a purchase.
      </p>

      <h2>Your content</h2>
      <p>
        You own the jobs, clients, time entries and expenses you enter. We
        store and process it to run the service for you and don&apos;t use it
        for anything else. You&apos;re responsible for having the right to
        store any information about your own clients that you choose to
        enter.
      </p>

      <h2>Client reports</h2>
      <p>
        The client report WorkWorth generates is a summary of work done — it
        is not an invoice, has no payment terms, and nothing in it is marked
        paid. You&apos;re responsible for how you use it with your own
        clients.
      </p>

      <h2>Acceptable use</h2>
      <p>
        Don&apos;t use WorkWorth for anything illegal, don&apos;t try to break
        or bypass its security, and don&apos;t resell or share access to your
        account with people outside your business.
      </p>

      <h2>Ending your account</h2>
      <p>
        You can delete your account at any time from Settings. We may
        suspend or terminate an account that violates these terms or that we
        reasonably believe is abusing the service.
      </p>

      <h2>No warranty</h2>
      <p>
        WorkWorth is provided &quot;as is,&quot; without warranties of any
        kind. We don&apos;t guarantee it will be uninterrupted, error-free, or
        fit for a particular purpose. Numbers on job and report screens are
        labeled &quot;estimated&quot; for a reason — verify anything you rely
        on for real financial decisions.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the fullest extent the law allows, WorkWorth and its operator
        aren&apos;t liable for indirect, incidental or consequential damages
        arising from your use of the service, including lost profits or lost
        data. Nothing here limits liability that can&apos;t legally be
        limited.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms or the service itself as WorkWorth
        develops. We&apos;ll update the date at the top of this page when we
        do.
      </p>

      <h2>Governing law</h2>
      <p>
        These terms are governed by the laws of the State of New York, USA,
        without regard to its conflict-of-law rules.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms: <a href="mailto:hello@workworth.de">hello@workworth.de</a>.
      </p>
    </LegalPage>
  );
}
