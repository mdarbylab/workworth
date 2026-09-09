"use client";

import { useActionState } from "react";
import { updateBusiness, type SettingsState } from "./actions";

const initial: SettingsState = {};

type Props = { name: string; timezone: string; timezones: string[]; currency: string };

export function BusinessForm({ name, timezone, timezones, currency }: Props) {
  const [state, action, pending] = useActionState(updateBusiness, initial);

  return (
    <form action={action} className="space-y-4">
      <div>
        <label htmlFor="name" className="label">Name</label>
        <input id="name" name="name" type="text" required maxLength={120} defaultValue={name} className="input" />
      </div>
      <div>
        <label htmlFor="timezone" className="label">Timezone</label>
        <select id="timezone" name="timezone" defaultValue={timezone} className="input">
          {timezones.map((tz) => (
            <option key={tz} value={tz}>{tz.replace(/_/g, " ")}</option>
          ))}
        </select>
        <p className="mt-1 text-xs text-stone-500">Days and reports are grouped in this timezone.</p>
      </div>
      <div>
        <label htmlFor="currency" className="label">Currency</label>
        <input id="currency" type="text" value={currency} readOnly className="input bg-stone-50 text-stone-500" />
      </div>

      {state.error && <p className="error">{state.error}</p>}
      {state.message && <p className="notice">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-auto px-5">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
