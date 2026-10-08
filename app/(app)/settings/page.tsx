import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionContext, nameFromEmail } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { subscriptionStatusLabel, type SubscriptionStatus } from "@/lib/billing";
import { signOut } from "@/app/(auth)/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { FeedbackLink } from "@/components/feedback-link";
import { CookiePreferencesButton } from "@/components/cookie-preferences-button";
import { TrackOnMount } from "@/components/analytics";
import { BusinessForm } from "./business-form";
import { NameForm } from "./name-form";
import { InviteForm } from "./invite-form";
import { CopyButton } from "./copy-button";
import { PasswordForm } from "./password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { UpgradeForm } from "./upgrade-form";
import { ManageBillingButton } from "./manage-billing-button";
import { removeMember } from "./actions";

export const metadata: Metadata = { title: "Settings" };

function timezoneOptions(current: string): string[] {
  const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return list.includes(current) ? list : [current, ...list];
}

export default async function SettingsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const ctx = await getSessionContext();
  if (!ctx?.organization || !ctx.membership) redirect("/onboarding");
  const org = ctx.organization;
  // Free plan: both people are peers. Only the creator may remove anyone or
  // delete the business (§6).
  const canManage = ctx.hasFullAccess;
  const isCreator = ctx.isCreator;

  const supabase = await createClient();
  const [{ data: members }, { data: subscription }, siteUrl, params] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, role, invited_email, invite_token, accepted_at, display_name")
      .eq("organization_id", org.id)
      .is("removed_at", null)
      .order("created_at"),
    supabase
      .from("subscriptions")
      .select("status, current_period_end, cancel_at")
      .eq("organization_id", org.id)
      .maybeSingle(),
    getSiteUrl(),
    searchParams,
  ]);

  const people = members ?? [];
  const seatsUsed = people.length; // pending invites hold a seat (§6)
  const seatsFull = seatsUsed >= org.seat_limit;
  const supportEmail = process.env.NEXT_PUBLIC_SUPPORT_EMAIL;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Business</h2>
        {canManage ? (
          <BusinessForm
            name={org.name}
            timezone={org.timezone}
            timezones={timezoneOptions(org.timezone)}
            currency={org.currency}
            address={org.address ?? ""}
            contactEmail={org.contact_email ?? ""}
            contactPhone={org.contact_phone ?? ""}
          />
        ) : (
          <dl className="space-y-2">
            <Row label="Name" value={org.name} />
            <Row label="Timezone" value={org.timezone} />
            <Row label="Currency" value={org.currency} />
          </dl>
        )}
      </section>

      <section className="card space-y-4">
        <div className="flex items-baseline justify-between">
          <h2 className="font-semibold">People</h2>
          <span className="text-xs text-slate-500">{seatsUsed} of {org.seat_limit} seats</span>
        </div>

        <ul className="divide-y divide-slate-100">
          {people.map((m) => {
            const isMe = m.user_id === ctx.user.id;
            const pending = m.accepted_at === null;
            const label = isMe
              ? ctx.displayName
              : m.display_name?.trim() || nameFromEmail(m.invited_email);
            const inviteUrl = `${siteUrl}/invite/${m.invite_token}`;
            return (
              <li key={m.id} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {label} {isMe && <span className="font-normal text-slate-400">(you)</span>}
                    </p>
                    <p className="text-xs text-slate-500">
                      {m.role === "owner" ? "Created this business" : "Full access"} ·{" "}
                      {pending ? "Invited — hasn't joined yet" : "Active"}
                    </p>
                    {!isMe && m.invited_email && (
                      <p className="truncate text-xs text-slate-400">{m.invited_email}</p>
                    )}
                  </div>
                  {isCreator && !isMe && (
                    <ConfirmDelete
                      action={removeMember}
                      id={m.id}
                      label={pending ? "Cancel invite" : "Remove"}
                      message={
                        pending
                          ? `Cancel the invite for ${label}?`
                          : `Remove ${label}? Their time and expenses stay with the business.`
                      }
                    />
                  )}
                </div>
                {canManage && pending && m.invite_token && (
                  <div className="rounded-lg bg-slate-50 p-3 text-xs">
                    <p className="mb-2 text-slate-600">Send this link to {m.invited_email}. They sign in with that email and tap Join.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-[11px] text-slate-700">{inviteUrl}</code>
                      <CopyButton text={inviteUrl} />
                      <a
                        href={`mailto:${m.invited_email}?subject=${encodeURIComponent(`Join ${org.name} on WorkWorth`)}&body=${encodeURIComponent(`Join ${org.name} on WorkWorth to track your time and expenses:\n\n${inviteUrl}`)}`}
                        className="rounded-md border border-slate-300 bg-white px-2 py-1 font-medium text-slate-700 hover:bg-slate-100"
                      >
                        Email it
                      </a>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {canManage && !seatsFull && <InviteForm />}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Plan</h2>
        {org.plan === "pro" ? (
          <>
            <p className="text-sm text-slate-700">
              {subscriptionStatusLabel(
                (subscription?.status as SubscriptionStatus | undefined) ?? null,
                subscription?.current_period_end ?? null,
                subscription?.cancel_at ?? null,
                org.timezone,
              )}
            </p>
            {isCreator && <ManageBillingButton />}
          </>
        ) : (
          <>
            <p className="text-sm text-slate-700">
              Free — {seatsUsed} of {org.seat_limit} seats used
            </p>
            <p className="text-sm text-slate-500">
              Everyone on the free plan has the same access: you both see all of the business&apos;s time,
              expenses and reports. Up to 10 people, separate roles and permissions, invoicing and tax
              estimates come with Pro.
            </p>
            {isCreator ? (
              <div className="flex flex-wrap gap-2">
                <UpgradeForm interval="month" label="Upgrade — $25/mo" />
                <UpgradeForm interval="year" label="Upgrade — $240/yr ($20/mo)" />
              </div>
            ) : (
              <p className="text-sm text-slate-500">Ask the business owner to upgrade to Pro.</p>
            )}
          </>
        )}
      </section>
      {params.upgraded === "1" && <TrackOnMount event="checkout_completed" />}

      {supportEmail && (
        <section className="card space-y-2">
          <h2 className="font-semibold">Feedback</h2>
          <p className="text-sm text-slate-600">
            WorkWorth is in beta. Tell us what&apos;s missing or broken — it goes straight to us.
          </p>
          <FeedbackLink email={supportEmail} className="btn-secondary" />
        </section>
      )}

      <section className="card space-y-2">
        <h2 className="font-semibold">Legal</h2>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          <Link href="/privacy" className="text-ink-800 hover:underline">Privacy Policy</Link>
          <Link href="/terms" className="text-ink-800 hover:underline">Terms of Service</Link>
          <Link href="/impressum" className="text-ink-800 hover:underline">Impressum</Link>
        </div>
        <CookiePreferencesButton />
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Account</h2>
        <NameForm displayName={ctx.displayName} />
        <Row label="Email" value={ctx.user.email ?? "—"} />
        <PasswordForm />
        <form action={signOut}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </section>

      <section className="card space-y-3 border-red-200">
        <h2 className="font-semibold text-red-800">Delete account</h2>
        <p className="text-sm text-slate-600">
          {isCreator
            ? people.length > 1
              ? "Remove the other people from your business first. Deleting your account then deletes the business and all its data."
              : "This deletes your account, your business, and all of its data. There is no undo."
            : "This deletes your account. Your past time and expenses stay with the business, shown as a former member."}
        </p>
        <DeleteAccountForm />
      </section>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
