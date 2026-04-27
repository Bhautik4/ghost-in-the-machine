"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ghost, Plus, LogIn, Loader2 } from "lucide-react";
import { generateRoomCode } from "@/lib/roomCode";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export default function Home() {
  const router = useRouter();
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");

  const handleCreate = () => {
    const code = generateRoomCode();
    router.push(`/room/${code}`);
  };

  const handleJoin = () => {
    const code = joinCode.trim().toUpperCase();
    if (code.length !== 6) {
      setError("Room code must be 6 characters");
      return;
    }
    if (!/^[A-Z0-9]+$/.test(code)) {
      setError("Only letters and numbers allowed");
      return;
    }
    setError("");
    router.push(`/room/${code}`);
  };

  return (
    <div className="h-screen w-screen bg-surface-deep flex items-center justify-center font-mono">
      <div className="w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-10 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 border border-accent mb-6">
            <Ghost size={32} className="text-accent-soft" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-[0.1em] uppercase shadow-black drop-shadow-md">
            Ghost in the Machine
          </h1>
          <p className="text-sm text-text-subtle mt-3 uppercase tracking-wider">
            A real-time social deduction game for coders
          </p>
        </div>

        {/* Create Game */}
        <div className="mb-6">
          <Button
            variant="primary"
            fullWidth
            size="lg"
            onClick={handleCreate}
            className="gap-2.5"
          >
            <Plus size={18} />
            Create Game
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6 opacity-60">
          <div className="flex-1 h-px bg-border" />
          <span className="text-[10px] text-text-faint uppercase tracking-[0.2em]">
            or join a room
          </span>
          <div className="flex-1 h-px bg-border" />
        </div>

        {/* Join Game */}
        <div className="flex gap-3 mb-2">
          <Input
            value={joinCode}
            onChange={(e) => {
              setJoinCode(e.target.value.toUpperCase().slice(0, 6));
              setError("");
            }}
            onKeyDown={(e) => e.key === "Enter" && handleJoin()}
            placeholder="ROOM CODE"
            maxLength={6}
            error={!!error}
            className="text-center tracking-[0.4em]"
          />
          <Button
            variant="secondary"
            onClick={handleJoin}
            disabled={joinCode.trim().length !== 6}
            className="gap-2 min-w-[100px]"
          >
            <LogIn size={16} />
            Join
          </Button>
        </div>

        {error && (
          <p className="text-xs text-red-400/90 text-center uppercase tracking-wider mt-2">
            {error}
          </p>
        )}

        <p className="text-[10px] text-surface-hover text-center mt-8 uppercase tracking-widest">
          Up to 4 players per room · 4-minute rounds
        </p>
      </div>
    </div>
  );
}
