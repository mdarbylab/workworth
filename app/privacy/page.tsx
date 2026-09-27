import type { Metadata } from "next";
import { LegalPage } from "@/components/legal-page";
import { CookiePreferencesLink } from "@/components/cookie-preferences-link";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="September 27, 2026">
      <p>
        WorkWorth (<a href="https://workworth.de">workworth.de</a>) is operated by
        Michael Darbyshire, an individual based in the United States. This
        policy explains what WorkWorth collects, why, and what you can do
        about it. For who runs WorkWorth and how to reach us, see the{" "}
        <a href="/impressum">Impressum</a>.
      </p>

      <h2>What we collect</h2>
      <p>Four kinds of data pass through WorkWorth:</p>
      <ul>
        <li>
          <strong>Your account.</strong> Your display name, email address, and
          password (stored as a salted hash by our authentication provider,
          Supabase — we never see it in plain text), plus your business&apos;s
          name, timezone and currency.
        </li>
        <li>
          <strong>What you enter about your own work.</strong> Job names,
          client names and contact details, time entries, expenses, and
          notes. This is data about <em>your</em> business and your clients —
          you control it, and you are responsible for having the right to
          store any client information you enter. We process it only to run
          the service for you.
        </li>
        <li>
          <strong>Usage analytics — only if you accept the cookie banner.</strong>{" "}
          A fixed list of product events (things like a job being created or a
          timer starting), tied to your account id, never to your name or
          email, and never including anything you typed. No autocapture and
          no session recording.
        </li>
        <li>
          <strong>Emails we send you.</strong> Sign-up confirmation, sign-in
          links, and password resets, sent through our email provider on our
          behalf.
        </li>
      </ul>

      <h2>Why we process it</h2>
      <p>
        Your account and business data: to provide the service you signed up
        for. Usage analytics: our legitimate interest in understanding
        whether WorkWorth is actually useful, which only runs after you
        accept it below. Emails: necessary to let you sign in and recover
        your account.
      </p>

      <h2>Where it&apos;s processed</h2>
      <p>
        WorkWorth runs on a small set of providers, each processing data on
        our behalf:
      </p>
      <ul>
        <li><strong>Supabase</strong> (database and sign-in) — United States.</li>
        <li><strong>Netlify</strong> (hosting) — United States.</li>
        <li><strong>Resend</strong> (sending confirmation and sign-in emails) — European Union.</li>
        <li><strong>PostHog</strong> (usage analytics, only once you&apos;ve accepted it) — United States.</li>
      </ul>
      <p>
        If you&apos;re in the European Economic Area, this means some of your
        data is processed outside it. We rely on each provider&apos;s standard
        contractual safeguards for that.
      </p>

      <h2>Cookies</h2>
      <p>
        WorkWorth sets one cookie to keep you signed in, which is required
        for the service to work and doesn&apos;t need your consent. It also
        stores your cookie choice itself, for the same reason.
      </p>
      <p>
        If you accept analytics below, PostHog sets an additional cookie (and
        a local storage entry) to recognize your browser across visits. This
        only happens after you accept — declining, or never answering, means
        it never runs. You can change your mind at any time:{" "}
        <CookiePreferencesLink />.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access or correct your account details, and export your time
        entries and expenses as CSV, at any time from inside WorkWorth. You
        can delete your account from Settings — if you&apos;re the only
        person in your business, this deletes the business and all its data;
        if there are other people, your login is removed but your past time
        and expense entries stay attributed to you within your business&apos;s
        own records, the same way they would for anyone who leaves.
      </p>
      <p>
        If you&apos;re in the EU or UK, you also have the right to object to
        processing, ask for data portability in a machine-readable format, and
        lodge a complaint with your local data protection authority. Contact
        us first at <a href="mailto:hello@workworth.de">hello@workworth.de</a>{" "}
        and we&apos;ll do our best to sort it out directly.
      </p>

      <h2>How long we keep it</h2>
      <p>
        Your account and business data stay as long as your account is open.
        Deleting your account removes your login immediately. We also run
        encrypted, access-restricted nightly database backups as a safety net
        against our own mistakes; we don&apos;t currently have an automated
        process to purge a deleted account from older backups, so a trace of
        deleted data can persist there for a period after deletion.
      </p>

      <h2>Children</h2>
      <p>WorkWorth isn&apos;t directed at children, and we don&apos;t knowingly collect data from anyone under 16.</p>

      <h2>Changes to this policy</h2>
      <p>
        If we change what we collect or why, we&apos;ll update the date at the
        top of this page. We&apos;ll try to give you notice for anything
        material.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy or your data:{" "}
        <a href="mailto:hello@workworth.de">hello@workworth.de</a>.
      </p>
    </LegalPage>
  );
}
