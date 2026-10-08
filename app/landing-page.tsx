import Link from "next/link";
import { Wordmark } from "@/components/wordmark";
import { LegalFooter } from "@/components/legal-footer";

const TARGET_USERS = [
  "Handyman",
  "Cleaner",
  "Landscaper",
  "Electrician",
  "Plumber",
  "Photographer",
  "Consultant",
  "Remodeling company",
];

const LOOP_STEPS = ["Create job", "Start timer", "Stop timer", "Add expenses", "See profit", "Export"];

export function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-6">
        <Wordmark />
        <nav className="flex items-center gap-4 text-sm font-medium">
          <Link href="/login" className="text-slate-700 hover:underline">Sign in</Link>
          <Link href="/signup" className="btn-primary w-auto px-4 py-2">Get started</Link>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-16">
        <section className="py-10 text-center sm:py-16">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-ink-900 sm:text-5xl">
            Know where your time goes, what you earned, and what you
            actually made.
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-lg text-slate-600">
            Time tracking and profit for independent contractors and small
            service businesses. Free for up to 2 people, forever.
          </p>
          <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link href="/signup" className="btn-primary w-auto px-6 py-3 text-base">
              Get started free
            </Link>
            <Link href="/login" className="btn-secondary w-auto px-6 py-3 text-base">
              Sign in
            </Link>
          </div>
          <p className="mt-3 text-sm text-slate-500">No trial, no card, no time limit.</p>
        </section>

        <section className="py-6 sm:py-10">
          <div className="card mx-auto max-w-sm">
            <p className="text-sm font-medium text-slate-500">Kitchen Remodel</p>
            <p className="mt-1 font-display text-2xl font-semibold text-ink-900">14h 32m</p>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Revenue</dt>
                <dd className="font-medium tabular-nums">$1,850</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Expenses</dt>
                <dd className="font-medium tabular-nums">$312</dd>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2">
                <dt className="font-medium text-ink-900">Profit</dt>
                <dd className="font-semibold tabular-nums text-ink-900">$1,538</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Effective rate</dt>
                <dd className="font-medium tabular-nums">$105.80/hr</dd>
              </div>
            </dl>
          </div>
          <p className="mx-auto mt-4 max-w-sm text-center text-sm text-slate-500">
            Track time against a job, log what you spent, and see what you
            actually made — not just what you billed.
          </p>
        </section>

        <section className="py-10 sm:py-16">
          <h2 className="text-center font-display text-2xl font-semibold text-ink-900">
            One loop, start to finish
          </h2>
          <ol className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {LOOP_STEPS.map((step, i) => (
              <li key={step} className="card flex flex-col items-center gap-2 text-center">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink-900 text-xs font-semibold text-white">
                  {i + 1}
                </span>
                <span className="text-sm font-medium text-ink-900">{step}</span>
              </li>
            ))}
          </ol>
        </section>

        <section className="py-10 sm:py-16">
          <h2 className="text-center font-display text-2xl font-semibold text-ink-900">
            Built for people who bill by the job or the hour
          </h2>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            {TARGET_USERS.map((u) => (
              <span key={u} className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-700">
                {u}
              </span>
            ))}
          </div>
        </section>

        <section className="py-10 sm:py-16">
          <h2 className="text-center font-display text-2xl font-semibold text-ink-900">Plans</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="card">
              <h3 className="font-display text-xl font-semibold text-ink-900">Free</h3>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-ink-900">
                $0 <span className="text-base font-normal text-slate-500">forever</span>
              </p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>2 people</li>
                <li>Unlimited jobs and time entries</li>
                <li>Expenses, dashboard, reports</li>
                <li>CSV export</li>
              </ul>
              <Link href="/signup" className="btn-secondary mt-6 w-auto px-4 py-2">Get started free</Link>
            </div>
            <div className="card border-ink-200">
              <h3 className="font-display text-xl font-semibold text-ink-900">Pro</h3>
              <p className="mt-1 text-3xl font-semibold tabular-nums text-ink-900">
                $20 <span className="text-base font-normal text-slate-500">/mo</span>
              </p>
              <p className="text-sm text-slate-500">Billed annually at $240/yr — or $25/mo billed monthly.</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-700">
                <li>Everything in Free</li>
                <li>Up to 10 people</li>
                <li>Set what each person can see and do</li>
                <li>14-day free trial</li>
              </ul>
              <Link href="/signup" className="btn-secondary mt-6 w-auto px-4 py-2">Start free trial</Link>
            </div>
          </div>
        </section>
      </main>

      <LegalFooter />
    </div>
  );
}
