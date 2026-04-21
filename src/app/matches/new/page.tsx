import Link from "next/link";
import { Nav } from "@/components/nav";
import { SetupNeeded, isSchemaMissing } from "@/components/setup-needed";
import { listActivePlayers } from "@/lib/players";
import type { Player } from "@/lib/types";
import { MatchForm } from "./form";

export const dynamic = "force-dynamic";

export default async function NewMatchPage() {
  let players: Player[];
  try {
    players = await listActivePlayers();
  } catch (e) {
    if (isSchemaMissing(e)) {
      return (
        <>
          <Nav />
          <SetupNeeded />
        </>
      );
    }
    throw e;
  }
  return (
    <>
      <Nav />
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">Log a match</h1>
        <p className="mt-1 text-sm text-neutral-500">
          First to 10 wins. Ratings update on submit.
        </p>
      </header>
      {players.length < 4 ? (
        <div className="border border-dashed border-neutral-300 py-12 text-center">
          <p className="text-sm text-neutral-500">
            Need at least four active players to log a match.
          </p>
          <Link href="/players/new" className="mt-3 inline-block text-sm underline">
            Add a player
          </Link>
        </div>
      ) : (
        <MatchForm players={players} />
      )}
    </>
  );
}
