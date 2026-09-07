"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import type { EntryFormState } from "./actions";

export type EntryDefaults = {
  jobId: string;
  date: string;
  startTime: string;
  stopTime: string;
  mode: "stop" | "duration";
  durationHours: string;
  durationMinutes: string;
  notes: string;
};

type Props = {
  jobs: Array<{ id: string; name: string; status: "active" | "archived" }>;
  defaults: EntryDefaults;
  action: (prev: EntryFormState, formData: FormData) => Promise<EntryFormState>;
  entryId?: string;
  submitLabel: string;
  cancelHref: string;
};

const initial: EntryFormState = {};

export function EntryForm({ jobs, defaults, action, entryId, submitLabel, cancelHref }: Props) {
  const [state, formAction, pending] = useActionState(action, initial);
  const [mode, setMode] = useState<"stop" | "duration">(defaults.mode);

  return (
    <form action={formAction} className="space-y-5">
      {entryId && <input type="hidden" name="id" value={entryId} />}

      {jobs.length === 0 && (
        <p className="notice">
          You need a job first.{" "}
          <Link href="/jobs/new" className="font-medium underline">Create one</Link> and come back.
        </p>
      )}

      <div>
        <label htmlFor="job_id" className="label">Job</label>
        <select id="job_id" name="job_id" defaultValue={defaults.jobId} required className="input">
          <option value="" disabled>Choose a job</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.name}{j.status === "archived" ? " (archived)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="date" className="label">Date</label>
          <input id="date" name="date" type="date" required defaultValue={defaults.date} className="input" />
        </div>
        <div>
          <label htmlFor="start_time" className="label">Start</label>
          <input id="start_time" name="start_time" type="time" required defaultValue={defaults.startTime} className="input" />
        </div>
      </div>

      <fieldset>
        <legend className="label">Then</legend>
        <div className="mb-3 grid grid-cols-2 gap-2">
          {(["stop", "duration"] as const).map((m) => (
            <label
              key={m}
              className={`cursor-pointer rounded-lg border px-3 py-2 text-center text-sm font-medium ${
                mode === m ? "border-emerald-700 bg-emerald-50 text-emerald-900" : "border-stone-300 bg-white text-stone-700"
              }`}
            >
              <input type="radio" name="mode" value={m} checked={mode === m} onChange={() => setMode(m)} className="sr-only" />
              {m === "stop" ? "Stop time" : "Duration"}
            </label>
          ))}
        </div>

        {mode === "stop" ? (
          <div>
            <label htmlFor="stop_time" className="label">Stop</label>
            <input id="stop_time" name="stop_time" type="time" required defaultValue={defaults.stopTime} className="input" />
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label htmlFor="duration_hours" className="label">Hours</label>
              <input id="duration_hours" name="duration_hours" type="number" min="0" step="1" inputMode="numeric" defaultValue={defaults.durationHours} className="input" placeholder="0" />
            </div>
            <div>
              <label htmlFor="duration_minutes" className="label">Minutes</label>
              <input id="duration_minutes" name="duration_minutes" type="number" min="0" max="59" step="1" inputMode="numeric" defaultValue={defaults.durationMinutes} className="input" placeholder="0" />
            </div>
          </div>
        )}
      </fieldset>

      <div>
        <label htmlFor="notes" className="label">
          Notes <span className="font-normal text-stone-400">(optional)</span>
        </label>
        <textarea id="notes" name="notes" rows={2} defaultValue={defaults.notes} className="input" />
      </div>

      {state.error && <p className="error">{state.error}</p>}
      {state.warning && (
        <div className="notice space-y-2">
          <p>{state.warning}</p>
          <label className="flex items-center gap-2 font-medium">
            <input type="checkbox" name="confirm_long" value="1" className="h-4 w-4" />
            Yes, save it anyway
          </label>
        </div>
      )}

      <div className="flex gap-3">
        <Link href={cancelHref} className="btn-secondary">Cancel</Link>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}
