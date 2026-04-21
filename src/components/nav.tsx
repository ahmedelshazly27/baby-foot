import Link from "next/link";

const LINKS = [
  { href: "/", label: "Leaderboard" },
  { href: "/stats", label: "Stats" },
  { href: "/matches", label: "History" },
  { href: "/matches/new", label: "Log match" },
  { href: "/players/new", label: "Add player" },
  { href: "/rating-system", label: "Math" },
];

export function Nav() {
  return (
    <nav className="mb-10 flex flex-wrap items-baseline justify-between gap-y-2 border-b border-neutral-200 pb-5">
      <Link href="/" className="text-sm font-medium tracking-tight">
        foosball.elo
      </Link>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
        {LINKS.slice(1).map((l) => (
          <Link key={l.href} href={l.href} className="text-neutral-600 hover:text-ink">
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
