import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { getSiteUrl } from "@/lib/site-url";
import { signOut } from "@/app/(auth)/actions";
import { ConfirmDelete } from "@/components/confirm-delete";
import { BusinessForm } from "./business-form";
import { InviteForm } from "./invite-form";
import { CopyButton } from "./copy-button";
import { PasswordForm } from "./password-form";
import { DeleteAccountForm } from "./delete-account-form";
import { removeMember } from "./actions";

export const metadata: Metadata = { title: "Settings" };

function timezoneOptions(current: string): string[] {
  const list = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
  return list.includes(current) ? list : [current, ...list];
}

export default async function SettingsPage() {
  const ctx = await getSessionContext();
  if (!ctx?.organization || !ctx.membership) redirect("/onboarding");
  const org = ctx.organization;
  const isOwner = ctx.membership.role === "owner";

  const supabase = await createClient();
  const [{ data: members }, siteUrl] = await Promise.all([
    supabase
      .from("memberships")
      .select("id, user_id, role, invited_email, invite_token, accepted_at")
      .eq("organization_id", org.id)
      .is("removed_at", null)
      .order("created_at"),
    getSiteUrl(),
  ]);

  const people = members ?? [];
  const seatsUsed = people.length; // pending invites hold a seat (§6)
  const seatsFull = seatsUsed >= org.seat_limit;
  const waitlistUrl = process.env.NEXT_PUBLIC_WAITLIST_URL;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Settings</h1>

      <section className="card space-y-4">
        <h2 className="font-semibold">Business</h2>
        {isOwner ? (
          <BusinessForm name={org.name} timezone={org.timezone} timezones={timezoneOptions(org.timezone)} currency={org.currency} />
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
          <span className="text-xs text-stone-500">{seatsUsed} of {org.seat_limit} seats</span>
        </div>

        <ul className="divide-y divide-stone-100">
          {people.map((m) => {
            const isMe = m.user_id === ctx.user.id;
            const pending = m.accepted_at === null;
            const label = isMe ? (ctx.user.email ?? "You") : (m.invited_email ?? "Owner");
            const inviteUrl = `${siteUrl}/invite/${m.invite_token}`;
            return (
              <li key={m.id} className="space-y-2 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {label} {isMe && <span className="font-normal text-stone-400">(you)</span>}
                    </p>
                    <p className="text-xs text-stone-500">
                      {m.role === "owner" ? "Owner" : "Member"} · {pending ? "Invited — hasn't joined yet" : "Active"}
                    </p>
                  </div>
                  {isOwner && !isMe && (
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
                {isOwner && pending && m.invite_token && (
                  <div className="rounded-lg bg-stone-50 p-3 text-xs">
                    <p className="mb-2 text-stone-600">Send this link to {m.invited_email}. They sign in with that email and tap Join.</p>
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="min-w-0 flex-1 truncate rounded bg-white px-2 py-1 text-[11px] text-stone-700">{inviteUrl}</code>
                      <CopyButton text={inviteUrl} />
                      <a
                        href={`mailto:${m.invited_email}?subject=${encodeURIComponent(`Join ${org.name} on WorkWorth`)}&body=${encodeURIComponent(`Join ${org.name} on WorkWorth to track your time and expenses:\n\n${inviteUrl}`)}`}
                        className="rounded-md border border-stone-300 bg-white px-2 py-1 font-medium text-stone-700 hover:bg-stone-100"
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

        {isOwner && !seatsFull && <InviteForm />}
      </section>

      <section className="card space-y-3">
        <h2 className="font-semibold">Plan</h2>
        <p className="text-sm text-stone-700">
          Free — {seatsUsed} of {org.seat_limit} seats used
        </p>
        {seatsFull && (
          <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm">
            <p className="font-medium text-emerald-900">Add another person → upgrade</p>
            <p className="mt-1 text-emerald-900/80">
              Pro brings more people, invoicing, and tax estimates.{" "}
              {waitlistUrl ? (
                <a href={waitlistUrl} target="_blank" rel="noopener noreferrer" className="font-medium underline">
                  Join the waitlist
                </a>
              ) : (
                <span>Waitlist opening soon.</span>
              )}
            </p>
          </div>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="font-semibold">Account</h2>
        <Row label="Email" value={ctx.user.email ?? "—"} />
        <PasswordForm />
        <form action={signOut}>
          <button type="submit" className="btn-secondary">Sign out</button>
        </form>
      </section>

      <section className="card space-y-3 border-red-200">
        <h2 className="font-semibold text-red-800">Delete account</h2>
        <p className="text-sm text-stone-600">
          {isOwner
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
      <span className="text-stone-500">{label}</span>
      <span className="truncate font-medium">{value}</span>
    </div>
  );
}
