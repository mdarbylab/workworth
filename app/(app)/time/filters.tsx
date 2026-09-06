"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

type Props = {
  jobs: Array<{ id: string; name: string }>;
  people: Array<{ userId: string; label: string }>;
};

export function TimeFilters({ jobs, people }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const set = (key: string, value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value) next.set(key, value);
    else next.delete(key);
    router.replace(`${pathname}${next.size ? `?${next}` : ""}`);
  };

  return (
    <div className="flex gap-2">
      <select
        aria-label="Filter by job"
        value={params.get("job") ?? ""}
        onChange={(e) => set("job", e.target.value)}
        className="input py-1.5 text-sm"
      >
        <option value="">All jobs</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>{j.name}</option>
        ))}
      </select>
      {people.length > 1 && (
        <select
          aria-label="Filter by person"
          value={params.get("person") ?? ""}
          onChange={(e) => set("person", e.target.value)}
          className="input py-1.5 text-sm"
        >
          <option value="">Everyone</option>
          {people.map((p) => (
            <option key={p.userId} value={p.userId}>{p.label}</option>
          ))}
        </select>
      )}
    </div>
  );
}
