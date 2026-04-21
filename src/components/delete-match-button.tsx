"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useRef } from "react";
import { deleteMatch, type FormState } from "@/app/matches/actions";

const INITIAL: FormState = {};

function ConfirmSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-ink bg-ink px-4 py-1.5 text-xs text-paper disabled:opacity-50"
    >
      {pending ? "Deleting…" : "Delete & rebuild"}
    </button>
  );
}

export function DeleteMatchButton({
  matchId,
  affectedPlayers,
}: {
  matchId: string;
  affectedPlayers: number;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction] = useFormState(deleteMatch, INITIAL);
  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className="text-xs text-neutral-500 underline-offset-2 hover:text-ink hover:underline"
      >
        Delete
      </button>
      <dialog
        ref={dialogRef}
        className="w-[min(90vw,420px)] border border-ink bg-paper p-6 backdrop:bg-neutral-900/30"
      >
        <form action={formAction}>
          <input type="hidden" name="id" value={matchId} />
          <h3 className="text-base font-medium">Delete this match?</h3>
          <p className="mt-3 text-sm text-neutral-600">
            Deleting rebuilds the rating trail from the earliest affected point
            forward. <span className="font-mono">{affectedPlayers}</span> player
            {affectedPlayers === 1 ? " has" : "s have"} ratings that will be
            recomputed.
          </p>
          {state.error && (
            <p className="mt-3 border border-ink px-3 py-2 text-sm" role="alert">
              {state.error}
            </p>
          )}
          <div className="mt-5 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="border border-neutral-300 px-4 py-1.5 text-xs"
            >
              Cancel
            </button>
            <ConfirmSubmit />
          </div>
        </form>
      </dialog>
    </>
  );
}
