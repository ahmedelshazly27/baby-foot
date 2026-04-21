import { notFound } from "next/navigation";
import Link from "next/link";
import { Nav } from "@/components/nav";
import { EditMatchForm } from "./form";
import { loadPlayersForEdit } from "@/app/matches/actions";
import { getReadClient } from "@/lib/supabase/server";
import { countAffectedByMatchChange } from "@/lib/rebuild";
import { getAdminClient } from "@/lib/supabase/server";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function EditMatchPage({ params }: { params: { id: string } }) {
  const supabase = getReadClient();
  const { data: match, error } = await supabase
    .from("matches")
    .select("*")
    .eq("id", params.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!match) notFound();

  const [players, affected] = await Promise.all([
    loadPlayersForEdit(params.id),
    countAffectedByMatchChange(getAdminClient(), params.id),
  ]);

  return (
    <>
      <Nav />
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">Edit match</h1>
        <p className="mt-1 text-sm text-neutral-500">
          Saving replays the rating trail from this match forward.
        </p>
      </header>
      <EditMatchForm match={match as Match} players={players} affectedPlayers={affected} />
      <div className="mt-8 text-sm">
        <Link href="/matches" className="text-neutral-500 hover:text-ink">
          ← Back to history
        </Link>
      </div>
    </>
  );
}
