"use client";

import { useActionState } from "react";
import { updateBusiness, type SettingsState } from "./actions";

const initial: SettingsState = {};

type Props = {
  name: string;
  timezone: string;
  timezones: string[];
  currency: string;
  address: string;
  contactEmail: string;
  contactPhone: string;
};

export function BusinessForm({ name, timezone, timezones, currency, address, contactEmail, contactPhone }: Props) {
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

      <fieldset className="space-y-4 border-t border-stone-100 pt-4">
        <legend className="label">
          On client reports <span className="font-normal text-stone-400">(all optional)</span>
        </legend>
        <p className="-mt-2 text-xs text-stone-500">
          These appear at the top of a report you hand to a client. Blank ones are left off.
        </p>
        <div>
          <label htmlFor="address" className="label">Address</label>
          <textarea id="address" name="address" rows={3} maxLength={300} defaultValue={address} className="input" placeholder="Street&#10;City, postcode" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="contact_phone" className="label">Phone</label>
            <input id="contact_phone" name="contact_phone" type="tel" maxLength={40} defaultValue={contactPhone} className="input" />
          </div>
          <div>
            <label htmlFor="contact_email" className="label">Contact email</label>
            <input id="contact_email" name="contact_email" type="email" defaultValue={contactEmail} className="input" placeholder="hello@yourbusiness.de" />
          </div>
        </div>
      </fieldset>

      {state.error && <p className="error">{state.error}</p>}
      {state.message && <p className="notice">{state.message}</p>}

      <button type="submit" disabled={pending} className="btn-primary w-auto px-5">
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
