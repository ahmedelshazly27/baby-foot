import { Nav } from "@/components/nav";
import { PlayerForm } from "./form";

export default function NewPlayerPage() {
  return (
    <>
      <Nav />
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">Add player</h1>
        <p className="mt-1 text-sm text-neutral-500">
          New players start at a rating of 1200.
        </p>
      </header>
      <PlayerForm />
    </>
  );
}
