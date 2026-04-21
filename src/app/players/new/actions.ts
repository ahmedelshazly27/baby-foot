"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminClient } from "@/lib/supabase/server";

export type FormState = { error?: string };

export async function createPlayer(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  // TODO: Supabase magic-link auth — gate this action behind a session.
  const raw = String(formData.get("name") ?? "").trim();
  if (raw.length < 1 || raw.length > 40) {
    return { error: "Name must be 1–40 characters." };
  }
  const supabase = getAdminClient();
  const { data: existing } = await supabase
    .from("players")
    .select("id")
    .ilike("name", raw)
    .maybeSingle();
  if (existing) return { error: "That name is already taken." };

  const { error } = await supabase.from("players").insert({ name: raw });
  if (error) return { error: error.message };

  revalidatePath("/");
  redirect("/");
}
