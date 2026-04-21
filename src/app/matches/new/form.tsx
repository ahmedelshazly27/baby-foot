"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createMatch, type FormState } from "./actions";
import type { Player } from "@/lib/types";

const INITIAL: FormState = {};

function isoLocalNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function PlayerSelect({
  name,
  label,
  players,
}: {
  name: string;
  label: string;
  players: Player[];
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-neutral-500">{label}</span>
      <select
        name={name}
        required
        className="border border-neutral-300 bg-paper px-3 py-2 font-sans"
        defaultValue=""
      >
        <option value="" disabled>
          Pick player…
        </option>
        {players.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
    </label>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-ink bg-ink px-6 py-2 text-sm text-paper disabled:opacity-50"
    >
      {pending ? "Recording…" : "Record match"}
    </button>
  );
}

export function MatchForm({ players }: { players: Player[] }) {
  const [state, formAction] = useFormState(createMatch, INITIAL);
  return (
    <form action={formAction} className="space-y-8">
      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500">Team A</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <PlayerSelect name="team_a_p1" label="Player 1" players={players} />
          <PlayerSelect name="team_a_p2" label="Player 2" players={players} />
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500">Team B</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <PlayerSelect name="team_b_p1" label="Player 1" players={players} />
          <PlayerSelect name="team_b_p2" label="Player 2" players={players} />
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500">Score</h2>
        <div className="mt-3 grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Team A score</span>
            <input
              name="score_a"
              type="number"
              min={0}
              max={10}
              required
              className="border border-neutral-300 bg-paper px-3 py-2 font-mono"
              defaultValue={10}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-neutral-500">Team B score</span>
            <input
              name="score_b"
              type="number"
              min={0}
              max={10}
              required
              className="border border-neutral-300 bg-paper px-3 py-2 font-mono"
              defaultValue={0}
            />
          </label>
        </div>
      </section>

      <section>
        <h2 className="text-sm uppercase tracking-wider text-neutral-500">When</h2>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="text-neutral-500">Played at</span>
          <input
            name="played_at"
            type="datetime-local"
            defaultValue={isoLocalNow()}
            className="border border-neutral-300 bg-paper px-3 py-2 font-mono"
          />
        </label>
      </section>

      {state.error && (
        <p className="border border-ink px-3 py-2 text-sm" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex justify-end">
        <SubmitButton />
      </div>
    </form>
  );
}
