"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

type Point = { idx: number; rating: number };

export function RatingSparkline({ points }: { points: Point[] }) {
  if (points.length < 2) {
    return (
      <div className="flex h-24 items-center justify-center text-xs text-neutral-400">
        Needs at least two matches to plot.
      </div>
    );
  }
  const ratings = points.map((p) => p.rating);
  const min = Math.min(...ratings);
  const max = Math.max(...ratings);
  const pad = Math.max(5, (max - min) * 0.15);
  return (
    <div className="h-24">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis hide domain={[min - pad, max + pad]} />
          <Line
            type="monotone"
            dataKey="rating"
            stroke="#0a0a0a"
            strokeWidth={1.5}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
