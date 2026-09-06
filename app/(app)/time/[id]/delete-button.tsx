"use client";

import { ConfirmDelete } from "@/components/confirm-delete";
import { deleteTimeEntry } from "../actions";

export function DeleteEntryButton({ entryId }: { entryId: string }) {
  return (
    <ConfirmDelete
      action={deleteTimeEntry}
      id={entryId}
      label="Delete entry"
      message="Delete this time entry? The change is recorded in history."
    />
  );
}
