import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getSessionContext } from "@/lib/session";
import { signOut } from "@/app/(auth)/actions";
import { AcceptForm } from "./accept-form";

export const metadata: Metadata = { title: "Join a business" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function InvitePage({ params }: PageProps<"/invite/[token]">) {
  const { token } = await params;
  const ctx = await getSessionContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);

  const supabase = await createClient();
  const { data } = UUID.test(token) ? await supabase.rpc("invite_preview", { token }) : { data: null };
  const invite = data?.[0] ?? null;

  let body: React.ReactNode;

  if (!invite) {
    body = <p className="text-sm text-stone-600">This invite link isn&apos;t valid. Ask the person who invited you for a new one.</p>;
  } else if (invite.state === "cancelled") {
    body = <p className="text-sm text-stone-600">This invite to {invite.organization_name} was cancelled.</p>;
  } else if (invite.state === "accepted") {
    body = ctx.organization?.name === invite.organization_name ? (
      <>
        <p className="text-sm text-stone-600">You&apos;re already part of {invite.organization_name}.</p>
        <Link href="/today" className="btn-primary">Go to Today</Link>
      </>
    ) : (
      <p className="text-sm text-stone-600">This invite has already been used.</p>
    );
  } else if (ctx.organization) {
    body = (
      <>
        <p className="text-sm text-stone-600">
          Your account already belongs to <strong>{ctx.organization.name}</strong>. WorkWorth supports one business per account for now.
        </p>
        <Link href="/today" className="btn-secondary">Back to Today</Link>
      </>
    );
  } else if ((ctx.user.email ?? "").toLowerCase() !== (invite.invited_email ?? "").toLowerCase()) {
    body = (
      <>
        <p className="text-sm text-stone-600">
          This invite was sent to <strong>{invite.invited_email}</strong>, but you&apos;re signed in as{" "}
          <strong>{ctx.user.email}</strong>.
        </p>
        <form action={signOut}>
          <button type="submit" className="btn-secondary">Sign out and switch accounts</button>
        </form>
      </>
    );
  } else {
    body = <AcceptForm token={token} organizationName={invite.organization_name} />;
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-2xl font-bold tracking-tight text-emerald-800">WorkWorth</p>
      </div>
      <div className="card w-full max-w-sm space-y-4">
        <h1 className="text-xl font-semibold">
          {invite && invite.state === "pending" ? `Join ${invite.organization_name}` : "Invitation"}
        </h1>
        {body}
      </div>
    </main>
  );
}
