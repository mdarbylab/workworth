"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type AcceptState = { error?: string };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function inviteErrorMessage(message: string): string {
  if (message.includes("seat limit")) return "This business has no free seats left. Ask the owner to make room.";
  if (message.includes("email mismatch")) return "This invite was sent to a different email address.";
  if (message.includes("already belongs")) return "Your account already belongs to a business. v1 supports one business per account.";
  if (message.includes("cancelled")) return "This invite was cancelled.";
  if (message.includes("already used")) return "This invite has already been used.";
  if (message.includes("not found")) return "This invite link isn't valid.";
  return "Couldn't accept the invite. Please try again.";
}

export async function acceptInvite(_prev: AcceptState, formData: FormData): Promise<AcceptState> {
  const token = String(formData.get("token") ?? "");
  if (!UUID.test(token)) return { error: "This invite link isn't valid." };

  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_invite", { token });
  if (error) return { error: inviteErrorMessage(error.message) };

  revalidatePath("/", "layout");
  redirect("/today");
}
