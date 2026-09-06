import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";
import { Nav } from "@/components/nav";
import { AvatarMenu } from "@/components/avatar-menu";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const ctx = await getSessionContext();
  if (!ctx) redirect("/login");
  if (!ctx.organization) redirect("/onboarding");

  return (
    <div className="flex min-h-full flex-1 flex-col md:flex-row">
      <Nav orgName={ctx.organization.name} avatar={<AvatarMenu email={ctx.user.email} />} />
      <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8">
        <div className="mx-auto w-full max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
