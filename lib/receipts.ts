// Receipt attachments on expenses (SPEC §5.4, Sprint 8). Files live in the
// private `receipts` Storage bucket at `{organization_id}/{expense_id}/{file}`;
// the storage policies in supabase/migrations/20261016000000_receipt_storage.sql
// key on that path, so it must never be built any other way.

export const RECEIPTS_BUCKET = "receipts";

/** Matches the bucket's own file_size_limit. See the migration for why 4 MB. */
export const MAX_RECEIPT_BYTES = 4 * 1024 * 1024;

/** How long a "View receipt" link works. Minted fresh on every click. */
export const RECEIPT_URL_TTL_SECONDS = 60;

const EXTENSIONS: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/heic": "heic",
  "image/heif": "heif",
  "application/pdf": "pdf",
};

/** For the file input's `accept` attribute. Same list as the bucket allows. */
export const RECEIPT_ACCEPT = Object.keys(EXTENSIONS).join(",");

export type ReceiptCheck =
  { ok: true; extension: string } | { ok: false; error: string };

/** Validate an uploaded file's type and size before it goes anywhere. */
export function checkReceipt(file: {
  type: string;
  size: number;
}): ReceiptCheck {
  const extension = EXTENSIONS[file.type];
  if (!extension)
    return {
      ok: false,
      error: "Receipts must be a photo (JPEG, PNG, WebP, HEIC) or a PDF.",
    };
  if (file.size > MAX_RECEIPT_BYTES)
    return {
      ok: false,
      error: "That receipt is over 4 MB. Try a smaller photo or PDF.",
    };
  if (file.size === 0) return { ok: false, error: "That file is empty." };
  return { ok: true, extension };
}

/**
 * The object path for a receipt. A fresh suffix every time, so replacing a
 * receipt never overwrites an object in place (the bucket has no update
 * policy) and a cached signed URL can't show the old file.
 */
export function receiptPath(
  organizationId: string,
  expenseId: string,
  extension: string,
  suffix: string,
): string {
  return `${organizationId}/${expenseId}/receipt-${suffix}.${extension}`;
}

/** A browser-sent form field holding a File, or null when nothing was picked. */
export function receiptFromForm(formData: FormData): File | null {
  const value = formData.get("receipt");
  if (!value || typeof value === "string" || value.size === 0) return null;
  return value;
}
