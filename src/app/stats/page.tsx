import Link from "next/link";
import { Nav } from "@/components/nav";
import { RatingTrajectories } from "@/components/rating-trajectories";
import { SetupNeeded, isSchemaMissing } from "@/components/setup-needed";
import { getReadClient } from "@/lib/supabase/server";
import {
  getBiggestSwings,
  getHeadlineNumbers,
  getRatingTrajectories,
} from "@/lib/stats";
import { formatDate, formatDelta, formatRating } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const supabase = getReadClient();
  try {
    const [{ players, dataset }, swings, headline] = await Promise.all([
      getRatingTrajectories(supabase),
      getBiggestSwings(supabase, 5),
      getHeadlineNumbers(supabase),
    ]);

    return (
      <>
        <Nav />
        <header className="mb-8">
          <h1 className="text-2xl font-medium tracking-tight">Stats</h1>
          <p className="mt-1 text-sm text-neutral-500">
            Ladder shape over time and the most dramatic matches.
          </p>
        </header>

        <section className="mb-10 grid grid-cols-2 gap-px border border-neutral-200 bg-neutral-200 md:grid-cols-4">
          <Stat label="Matches" value={headline.totalMatches.toString()} />
          <Stat label="Active players" value={headline.totalPlayers.toString()} />
          <Stat
            label="Avg margin"
            value={headline.avgScoreDiff.toFixed(1)}
            hint="|score_a − score_b|"
          />
          <Stat
            label="Top of ladder"
            value={
              headline.topRatingName
                ? `${headline.topRatingName} ${formatRating(headline.topRating ?? 0)}`
                : "—"
            }
          />
        </section>

        <section className="mb-12">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-neutral-500">
            Rating trajectories
          </h2>
          <RatingTrajectories players={players} dataset={dataset} />
          <p className="mt-3 text-xs text-neutral-500">
            Every player starts at 1200. Each bend is a match. Hover a line to
            read the exact rating.
          </p>
        </section>

        <section className="mb-12">
          <h2 className="mb-3 text-sm uppercase tracking-wider text-neutral-500">
            Biggest swings
          </h2>
          {swings.length === 0 ? (
            <p className="py-6 text-sm text-neutral-500">No matches yet.</p>
          ) : (
            <ol className="space-y-3">
              {swings.map((s, i) => (
                <li
                  key={s.id}
                  className="grid grid-cols-[2rem_1fr_auto] items-center gap-4 border border-neutral-200 px-4 py-3"
                >
                  <span className="font-mono text-lg text-neutral-500">
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <div className="text-sm">
                      {s.team_a_names.join(" · ")}{" "}
                      <span className="mx-2 font-mono text-neutral-500">
                        {s.score_a}–{s.score_b}
                      </span>{" "}
                      {s.team_b_names.join(" · ")}
                    </div>
                    <div className="font-mono text-xs text-neutral-500">
                      {formatDate(s.played_at)} · team A {formatDelta(s.deltaA)}{" "}
                      · team B {formatDelta(s.deltaB)}
                    </div>
                  </div>
                  <span className="font-mono text-base">
                    {formatDelta(Math.sign(s.deltaA) * s.magnitude)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>

        <section className="border-t border-neutral-200 pt-6 text-sm text-neutral-500">
          Want to understand why a rating moves the way it does? Read{" "}
          <Link href="/rating-system" className="underline text-ink">
            how the rating works
          </Link>
          .
        </section>
      </>
    );
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
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-paper px-4 py-4">
      <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      <div className="mt-1 font-mono text-xl">{value}</div>
      {hint && <div className="mt-0.5 font-mono text-[10px] text-neutral-400">{hint}</div>}
    </div>
  );
}
