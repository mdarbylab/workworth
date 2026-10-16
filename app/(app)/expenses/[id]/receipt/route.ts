import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { RECEIPTS_BUCKET, RECEIPT_URL_TTL_SECONDS } from "@/lib/receipts";

// "View receipt" (SPEC §5.4). The bucket is private, so a link is minted on
// every click and expires a minute later — nothing permanent to forward or
// leak. Both the expense lookup and the signing run as the signed-in person,
// so RLS and the storage select policy decide whether they may see it.
export async function GET(
  _req: Request,
  { params }: RouteContext<"/expenses/[id]/receipt">,
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: expense } = await supabase
    .from("expenses")
    .select("receipt_path")
    .eq("id", id)
    .maybeSingle();
  if (!expense?.receipt_path)
    return new NextResponse("Receipt not found", { status: 404 });

  const { data } = await supabase.storage
    .from(RECEIPTS_BUCKET)
    .createSignedUrl(expense.receipt_path, RECEIPT_URL_TTL_SECONDS);
  if (!data?.signedUrl)
    return new NextResponse("Receipt not found", { status: 404 });

  return NextResponse.redirect(data.signedUrl, {
    headers: { "Cache-Control": "private, no-store" },
  });
}
