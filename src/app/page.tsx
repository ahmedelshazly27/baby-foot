import Link from "next/link";
import { Nav } from "@/components/nav";
import { MatchToast } from "@/components/match-toast";
import { getReadClient } from "@/lib/supabase/server";
import { formatRating } from "@/lib/format";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = { inactive?: string; match?: string };

export default async function Leaderboard({
  searchParams,
}: {
  searchParams: Search;
}) {
  const includeInactive = searchParams?.inactive === "1";
  const flashMatchId = searchParams?.match;
  const supabase = getReadClient();
  const query = supabase
    .from("players")
    .select("*")
    .order("rating", { ascending: false })
    .order("name", { ascending: true });
  const { data, error } = includeInactive
    ? await query
    : await query.eq("active", true);
  if (error) throw new Error(error.message);
  const players = (data ?? []) as Player[];

  return (
    <>
      <Nav />
      {flashMatchId && <MatchToast matchId={flashMatchId} />}
      <header className="mb-8 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-medium tracking-tight">Leaderboard</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ranked by current rating. Starts at 1200.
          </p>
        </div>
        <Link
          href={includeInactive ? "/" : "/?inactive=1"}
          className="text-sm text-neutral-500 hover:text-ink"
        >
          {includeInactive ? "Hide inactive" : "Show inactive"}
        </Link>
      </header>

      {players.length === 0 ? (
        <EmptyState />
      ) : (
        <table>
          <thead>
            <tr>
              <th className="w-12">#</th>
              <th>Player</th>
              <th className="text-right">Rating</th>
              <th className="text-right">W&ndash;L</th>
              <th className="text-right">Games</th>
            </tr>
          </thead>
          <tbody>
            {players.map((p, i) => (
              <tr key={p.id}>
                <td className="font-mono text-neutral-500">{i + 1}</td>
                <td>
                  <Link href={`/players/${p.id}`} className="hover:underline">
                    {p.name}
                    {!p.active && (
                      <span className="ml-2 text-xs text-neutral-400">inactive</span>
                    )}
                  </Link>
                </td>
                <td className="text-right font-mono">{formatRating(p.rating)}</td>
                <td className="text-right font-mono">
                  {p.wins}&ndash;{p.losses}
                </td>
                <td className="text-right font-mono text-neutral-500">{p.games_played}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="border border-dashed border-neutral-300 py-16 text-center">
      <p className="text-sm text-neutral-500">No players yet.</p>
      <Link href="/players/new" className="mt-3 inline-block text-sm underline">
        Add the first player
      </Link>
    </div>
  );
}
