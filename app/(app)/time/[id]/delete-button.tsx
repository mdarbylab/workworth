"use client";

import { deleteTimeEntry } from "../actions";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  return (
    <form
      action={deleteTimeEntry}
      onSubmit={(e) => {
        if (!confirm("Delete this time entry? The change is recorded in history.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="id" value={entryId} />
      <button type="submit" className="w-full py-2 text-sm text-red-700 hover:underline">
        Delete entry
      </button>
    </form>
  );
}
