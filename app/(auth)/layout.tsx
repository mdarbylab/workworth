import { redirect } from "next/navigation";
import { getSessionContext } from "@/lib/session";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const ctx = await getSessionContext();
  if (ctx) redirect("/");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <p className="text-2xl font-bold tracking-tight text-emerald-800">WorkWorth</p>
        <p className="mt-1 text-sm text-stone-500">
          Know what your time is worth.
        </p>
      </div>
      <div className="card w-full max-w-sm">{children}</div>
    </main>
  );
}
