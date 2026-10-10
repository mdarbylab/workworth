"use client";

import { useActionState } from "react";
import { updateRounding, type SettingsState } from "./actions";

const initial: SettingsState = {};

const INCREMENTS: Array<{ value: string; label: string }> = [
  { value: "", label: "Off — bill exact tracked time" },
  { value: "5", label: "Nearest 5 minutes" },
  { value: "10", label: "Nearest 10 minutes" },
  { value: "15", label: "Nearest 15 minutes" },
  { value: "30", label: "Nearest 30 minutes" },
];

const MODES: Array<{ value: string; label: string }> = [
  { value: "nearest", label: "Round to nearest" },
  { value: "up", label: "Always round up" },
  { value: "down", label: "Always round down" },
];

export function BillingRoundingForm({
  timeRoundingMinutes,
  timeRoundingMode,
}: {
  timeRoundingMinutes: number | null;
  timeRoundingMode: string;
}) {
  const [state, action, pending] = useActionState(updateRounding, initial);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div>
        <label htmlFor="increment" className="label">Round each visit to</label>
        <select
          id="increment"
          name="increment"
          defaultValue={timeRoundingMinutes === null ? "" : String(timeRoundingMinutes)}
          className="input"
        >
          {INCREMENTS.map((i) => (
            <option key={i.value} value={i.value}>{i.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="mode" className="label">Direction</label>
        <select id="mode" name="mode" defaultValue={timeRoundingMode} className="input">
          {MODES.map((m) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </div>
      <button type="submit" disabled={pending} className="btn-secondary w-auto px-4 py-2 text-sm">
        {pending ? "Saving…" : "Save"}
      </button>
      {state.error && <p className="error w-full">{state.error}</p>}
      {state.message && <p className="notice w-full">{state.message}</p>}
    </form>
  );
}
