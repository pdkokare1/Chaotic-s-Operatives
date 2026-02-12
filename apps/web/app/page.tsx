"use client";

import { useSocket } from "../context/SocketContext";

export default function Home() {
  const { isConnected, socket } = useSocket();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-neutral-900 text-white">
      <h1 className="text-6xl font-bold tracking-tighter mb-8">OPERATIVE</h1>
      
      {/* Status Indicator */}
      <div className={`px-4 py-2 rounded-full border ${
        isConnected 
          ? "border-green-500 bg-green-500/10 text-green-400" 
          : "border-red-500 bg-red-500/10 text-red-400"
      }`}>
        {isConnected ? "● SYSTEM ONLINE" : "○ SEARCHING FOR SERVER..."}
      </div>

      <div className="mt-8 text-neutral-500 font-mono text-sm">
        Server ID: {socket?.id || "Unknown"}
      </div>
    </main>
  );
}
