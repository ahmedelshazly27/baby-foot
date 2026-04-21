import Link from "next/link";
import { Nav } from "@/components/nav";

export const metadata = {
  title: "How the rating works",
};

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <pre className="my-3 border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-xs leading-relaxed">
      {children}
    </pre>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-neutral-200 py-6 first:border-t-0 first:pt-0">
      <h2 className="mb-3 text-base font-medium tracking-tight">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-neutral-700">
        {children}
      </div>
    </section>
  );
}

export default function RatingSystemPage() {
  return (
    <>
      <Nav />
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">How the rating works</h1>
        <p className="mt-1 text-sm text-neutral-500">
          A non-mathy tour of the numbers, plus the exact formulas for the
          curious.
        </p>
      </header>

      <Section title="What ELO is">
        <p>
          <strong>ELO</strong> is a rating number that estimates how strong a
          player is relative to everyone they&apos;ve played. When the expected
          winner wins, ratings barely move; when the underdog wins, the swing is
          much bigger.
        </p>
        <p>Every player starts at a rating of <span className="font-mono">1200</span>.</p>
      </Section>

      <Section title="Team ratings">
        <p>
          A match is 2v2, but each person carries their own rating. To compute
          who was expected to win, we take the simple average of each team&apos;s
          two players:
        </p>
        <Formula>{`R_team_A = (R_player_1 + R_player_2) / 2
R_team_B = (R_player_3 + R_player_4) / 2`}</Formula>
        <p>
          Whatever the team gains or loses is applied to both teammates
          separately — both players on the winning side move by the same amount,
          same for the losing side.
        </p>
      </Section>

      <Section title="Expected win probability">
        <p>
          Given the two team ratings, the classic ELO formula gives each team&apos;s
          expected win probability:
        </p>
        <Formula>{`E_A = 1 / (1 + 10 ^ ((R_team_B − R_team_A) / 400))
E_B = 1 − E_A`}</Formula>
        <p>
          A 400-point gap means the stronger team is expected to win roughly 10
          times out of 11. A 0-point gap is a coin flip (<span className="font-mono">0.5 / 0.5</span>).
        </p>
      </Section>

      <Section title="K-factor — how fast ratings move">
        <p>
          <strong>K-factor</strong> is the &ldquo;volume knob&rdquo; on how much
          a single match can move a rating. Bigger K, bigger moves. We use three
          tiers by games played:
        </p>
        <div className="my-3 overflow-hidden border border-neutral-200">
          <table>
            <thead>
              <tr>
                <th className="px-4">Games played</th>
                <th className="px-4">K</th>
                <th className="px-4">Meaning</th>
              </tr>
            </thead>
            <tbody className="font-mono text-xs">
              <tr>
                <td className="px-4">under 10</td>
                <td className="px-4">40</td>
                <td className="px-4 font-sans text-sm">Provisional — snap into place quickly</td>
              </tr>
              <tr>
                <td className="px-4">10 – 30</td>
                <td className="px-4">24</td>
                <td className="px-4 font-sans text-sm">Settling in</td>
              </tr>
              <tr>
                <td className="px-4">30 +</td>
                <td className="px-4">16</td>
                <td className="px-4 font-sans text-sm">Established — ratings are sticky</td>
              </tr>
            </tbody>
          </table>
        </div>
        <p>
          Each team&apos;s K is the <em>average</em> K of its two players. So a
          mix of a rookie (K = 40) and a veteran (K = 16) gives a team K of 28.
        </p>
      </Section>

      <Section title="Score margin — a sweep counts more than a squeaker">
        <p>
          A 10–0 sweep should say more than a 10–9 nail-biter. We multiply the
          team K by a log-based margin factor:
        </p>
        <Formula>{`margin = ln(|score_A − score_B| + 1) / ln(11)`}</Formula>
        <p>That factor lands at:</p>
        <Formula>{`10 − 0  →  1.00   (full swing)
10 − 5  →  0.75
10 − 9  →  0.29   (small swing)`}</Formula>
      </Section>

      <Section title="Putting it together — the final delta">
        <p>For each team, multiply everything out:</p>
        <Formula>{`K_team_A = avg(baseK(p1), baseK(p2)) × margin
K_team_B = avg(baseK(p3), baseK(p4)) × margin

delta_A = K_team_A × (S_A − E_A)
delta_B = K_team_B × (S_B − E_B)`}</Formula>
        <p>
          <span className="font-mono">S_A</span> is 1 if team A won and 0 if
          they lost (<span className="font-mono">S_B = 1 − S_A</span>). Each
          player on team A has <span className="font-mono">delta_A</span> added
          to their rating. Each player on team B has{" "}
          <span className="font-mono">delta_B</span> added.
        </p>
      </Section>

      <Section title="Why losses can outweigh wins">
        <p>
          Because K is averaged <em>per team</em>, <span className="font-mono">delta_A</span>{" "}
          and <span className="font-mono">delta_B</span> are not guaranteed to
          be equal and opposite. That&apos;s intentional. It lets provisional
          newcomers settle in fast without yanking established ratings around
          disproportionately.
        </p>
      </Section>

      <Section title="Worked example">
        <p>
          Alex (1320, 40 games) and Blair (1280, 25 games) play Casey (1150, 8
          games) and Dana (1210, 12 games). Alex &amp; Blair win{" "}
          <span className="font-mono">10–4</span>.
        </p>
        <Formula>{`R_team_A = (1320 + 1280) / 2 = 1300
R_team_B = (1150 + 1210) / 2 = 1180
E_A      = 1 / (1 + 10 ^ ((1180 − 1300) / 400)) ≈ 0.666
margin   = ln(6 + 1) / ln(11)                  ≈ 0.811
K_team_A = avg(16, 24) × 0.811 = 20 × 0.811    ≈ 16.23
K_team_B = avg(40, 24) × 0.811 = 32 × 0.811    ≈ 25.97
delta_A  = 16.23 × (1 − 0.666)                 ≈ +5.42
delta_B  = 25.97 × (0 − 0.334)                 ≈ −8.67`}</Formula>
        <p>
          Alex and Blair each gain{" "}
          <span className="font-mono">+5.42</span>. Casey and Dana each drop{" "}
          <span className="font-mono">−8.67</span>. Casey&apos;s provisional K
          made the losing side swing harder than the winning side.
        </p>
      </Section>

      <Section title="What about editing or deleting a match?">
        <p>
          When a past match is edited or deleted, every subsequent rating is
          recomputed from the moment of change forward — we never keep a stale
          history. A confirmation modal tells you how many players&apos; ratings
          will move before the replay runs.
        </p>
      </Section>

      <div className="mt-6 text-sm">
        <Link href="/stats" className="underline">
          See the ladder in motion on the Stats page →
        </Link>
      </div>
    </>
  );
}
