"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createPlayer, type FormState } from "./actions";

const INITIAL: FormState = {};

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="border border-ink bg-ink px-6 py-2 text-sm text-paper disabled:opacity-50"
    >
      {pending ? "Adding…" : "Add player"}
    </button>
  );
}

export function PlayerForm() {
  const [state, formAction] = useFormState(createPlayer, INITIAL);
  return (
    <form action={formAction} className="space-y-6">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-neutral-500">Name</span>
        <input
          name="name"
          required
          maxLength={40}
          autoFocus
          className="border border-neutral-300 bg-paper px-3 py-2"
          placeholder="Pat Goalkeeper"
        />
      </label>
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
