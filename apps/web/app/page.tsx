// apps/web/app/page.tsx
import { GameState } from "@operative/shared";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24">
      <h1 className="text-4xl font-bold mb-4">OPERATIVE</h1>
      <p className="text-xl">Status: Lobby</p>
    </main>
  );
}
