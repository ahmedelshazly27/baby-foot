import { getReadClient } from "@/lib/supabase/server";
import type { Player } from "@/lib/types";

export async function listActivePlayers(): Promise<Player[]> {
  const supabase = getReadClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Player[];
}

export async function listAllPlayers(): Promise<Player[]> {
  const supabase = getReadClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Player[];
}

export async function getPlayer(id: string): Promise<Player | null> {
  const supabase = getReadClient();
  const { data, error } = await supabase
    .from("players")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data as Player | null) ?? null;
}
