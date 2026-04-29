"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Ghost, Plus, LogIn } from "lucide-react";
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
    <div className="h-screen w-screen bg-surface-deep flex items-center justify-center">
      <div className="w-full max-w-md mx-4">
        {/* Logo & Title */}
        <div className="text-center mb-12 flex flex-col items-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-lg border border-accent/40 bg-accent/5 mb-6">
            <Ghost size={30} className="text-accent-soft" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary tracking-wide">
            Ghost in the Machine
          </h1>
          <p className="text-sm text-text-muted mt-2">
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
            <Plus size={20} />
            Create Game
          </Button>
        </div>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-border-subtle" />
          <span className="text-xs text-text-subtle">or join a room</span>
          <div className="flex-1 h-px bg-border-subtle" />
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
            className="text-center tracking-[0.3em] uppercase"
          />
          <Button
            variant="secondary"
            onClick={handleJoin}
            disabled={joinCode.trim().length !== 6}
            className="gap-2 min-w-[100px]"
          >
            <LogIn size={18} />
            Join
          </Button>
        </div>

        {error && (
          <p className="text-xs text-ghost-light text-center mt-2">{error}</p>
        )}

        {/* Footer info */}
        <p className="text-xs text-text-subtle text-center mt-10">
          Up to 4 players per room · 4-minute rounds · Voice chat built-in
        </p>

        <div className="text-center mt-3">
          <a
            href="/rules"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-accent-light hover:text-accent-soft transition-colors"
          >
            How to Play →
          </a>
        </div>
      </div>
    </div>
  );
}
