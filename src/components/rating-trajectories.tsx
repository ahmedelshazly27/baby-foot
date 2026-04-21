"use client";

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TrajectoryPoint, PlayerLite } from "@/lib/stats";

// Six grey stops + three line styles = 18 distinct series before repeats.
const SHADES = ["#0a0a0a", "#3a3a3a", "#606060", "#888888", "#b0b0b0", "#c8c8c8"];
const DASHES: (string | undefined)[] = [undefined, "5 3", "2 3"];

function styleFor(i: number) {
  const shade = SHADES[i % SHADES.length];
  const dash = DASHES[Math.floor(i / SHADES.length) % DASHES.length];
  return { stroke: shade, strokeDasharray: dash };
}

function shortDate(iso: string): string {
  const d = new Date(iso);
  return `${d.getMonth() + 1}/${d.getDate()}`;
}

export function RatingTrajectories({
  players,
  dataset,
}: {
  players: PlayerLite[];
  dataset: TrajectoryPoint[];
}) {
  if (dataset.length < 2 || players.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center border border-dashed border-neutral-300 text-sm text-neutral-500">
        Need at least one match to show rating trajectories.
      </div>
    );
  }
  const names = players.map((p) => p.name);
  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={dataset} margin={{ top: 12, right: 48, bottom: 8, left: 0 }}>
          <CartesianGrid stroke="#e5e5e5" strokeDasharray="2 3" vertical={false} />
          <XAxis
            dataKey="date"
            tick={{ fill: "#737373", fontSize: 11, fontFamily: "var(--font-mono)" }}
            tickFormatter={shortDate}
            stroke="#d4d4d4"
          />
          <YAxis
            domain={["auto", "auto"]}
            tick={{ fill: "#737373", fontSize: 11, fontFamily: "var(--font-mono)" }}
            stroke="#d4d4d4"
            width={48}
          />
          <Tooltip
            labelFormatter={(l) => shortDate(String(l))}
            contentStyle={{
              background: "#fafafa",
              border: "1px solid #0a0a0a",
              borderRadius: 0,
              fontFamily: "var(--font-mono)",
              fontSize: 12,
            }}
            formatter={(v) =>
              typeof v === "number" ? v.toFixed(1) : String(v ?? "")
            }
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, fontFamily: "var(--font-sans)", paddingTop: 8 }}
          />
          {names.map((name, i) => {
            const s = styleFor(i);
            return (
              <Line
                key={name}
                type="monotone"
                dataKey={name}
                stroke={s.stroke}
                strokeDasharray={s.strokeDasharray}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            );
          })}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
