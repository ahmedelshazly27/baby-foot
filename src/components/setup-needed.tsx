import Link from "next/link";

// PostgREST error code for "table not in schema cache" — fires when the
// initial migration hasn't been applied yet.
export const SCHEMA_MISSING_CODE = "PGRST205";

export function isSchemaMissing(err: unknown): boolean {
  if (!err) return false;
  // Supabase returns a PostgrestError-shaped plain object with `code` and
  // `message`, not an Error instance. Check both shapes.
  const asRecord = err as { code?: string; message?: string };
  if (asRecord.code === SCHEMA_MISSING_CODE) return true;
  const text =
    err instanceof Error
      ? err.message
      : asRecord.message ?? JSON.stringify(err);
  return (
    text.includes(SCHEMA_MISSING_CODE) ||
    /Could not find the table/.test(text) ||
    /schema cache/.test(text)
  );
}

export function SetupNeeded() {
  return (
    <div className="border border-ink px-5 py-6">
      <h2 className="text-base font-medium">Database not initialised yet</h2>
      <p className="mt-2 text-sm text-neutral-600">
        The Supabase schema hasn&apos;t been applied. Open the{" "}
        <a
          href="https://supabase.com/dashboard/project/_/sql"
          className="underline"
          target="_blank"
          rel="noreferrer"
        >
          SQL editor
        </a>
        , paste the contents of{" "}
        <code className="font-mono text-xs">supabase/migrations/0001_init.sql</code>{" "}
        and run it. Then reload this page or run{" "}
        <code className="font-mono text-xs">pnpm seed</code> to populate a
        starter ladder.
      </p>
      <p className="mt-3 text-sm text-neutral-600">
        Already applied it?{" "}
        <Link href="/" className="underline">
          Reload
        </Link>
        .
      </p>
    </div>
  );
}
