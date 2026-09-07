import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="card w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Not found</h1>
        <p className="text-sm text-stone-600">
          That page doesn&apos;t exist, or it belongs to a different business.
        </p>
        <Link href="/today" className="btn-primary">Back to Today</Link>
      </div>
    </main>
  );
}
