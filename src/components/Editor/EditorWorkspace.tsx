"use client";

import { useEffect, useRef } from "react";
import { useStorage, useSelf, useMutation } from "@liveblocks/react/suspense";
import { GameEditor } from "@/components/Editor/GameEditor";
import { TitleBar } from "@/components/Editor/TitleBar";
import { GameHUD } from "@/components/Editor/GameHUD";
import { GameOverlay } from "@/components/Editor/GameOverlay";
import { GhostHauntButton } from "@/components/Multiplayer/GhostHauntButton";
import { GhostTaunts } from "@/components/Multiplayer/GhostTaunts";
import { DemonVoiceListener } from "@/components/Multiplayer/DemonVoiceListener";
import { RoleBanner } from "@/components/Editor/RoleBanner";

import { BlackoutOverlay } from "@/components/Editor/BlackoutOverlay";
import { GlitchOverlay } from "@/components/Editor/GlitchOverlay";
import { ParanoiaEffects } from "@/components/Editor/ParanoiaEffects";
import { SoundEngine } from "@/components/Editor/SoundEngine";
import { WhisperEngine } from "@/components/Editor/WhisperEngine";
import { NarratorEngine } from "@/components/Editor/NarratorEngine";
import { BreadcrumbToast } from "@/components/Editor/BreadcrumbToast";
import { EditActivityLog } from "@/components/Editor/EditActivityLog";
import { useGameStore } from "@/store/gameStore";
import { playGameOver } from "@/lib/sounds";
import { MAX_GAME_DURATION_MS } from "@/lib/roomCode";

interface EditorWorkspaceProps {
  roomCode: string;
}

export function EditorWorkspace({ roomCode }: EditorWorkspaceProps) {
  const gameStatus = useStorage((root) => root.gameStatus);
  const ghostId = useStorage((root) => root.ghostId);
  const self = useSelf();
  const { paranoiaMeter, ghostEvents, startGame, phase, endGame } =
    useGameStore();

  const gameStartRef = useRef(Date.now());

  const myPlayerId = self?.presence.playerId;
  const isGhost = myPlayerId != null && ghostId === myPlayerId;

  // Bootstrap local Zustand state
  useEffect(() => {
    if (gameStatus === "active" && phase !== "playing") {
      startGame();
      gameStartRef.current = Date.now();
    }
  }, [gameStatus, phase, startGame]);

  // Sync Liveblocks gameStatus → Zustand phase for win/loss
  useEffect(() => {
    if (gameStatus === "engineers-win" && phase === "playing") {
      playGameOver();
      endGame("engineers");
    }
    if (gameStatus === "ghost-wins" && phase === "playing") {
      playGameOver();
      endGame("ghost");
    }
  }, [gameStatus, phase, endGame]);

  // 10-minute force-close timer
  const forceClose = useMutation(({ storage }) => {
    const status = storage.get("gameStatus");
    if (status === "active") {
      storage.set("gameStatus", "ghost-wins");
    }
  }, []);

  useEffect(() => {
    if (gameStatus !== "active") return;
    const timer = setTimeout(() => {
      forceClose();
    }, MAX_GAME_DURATION_MS);
    return () => clearTimeout(timer);
  }, [gameStatus, forceClose]);

  const hasScanline = ghostEvents.some((e) => e.type === "scanline");

  return (
    <div
      className={`h-screen w-screen flex flex-col overflow-hidden bg-surface-deep ${
        paranoiaMeter > 80 ? "paranoia-border" : ""
      } ${hasScanline ? "scanline-overlay" : ""}`}
    >
      <RoleBanner isGhost={isGhost} />
      <ParanoiaEffects />
      <BlackoutOverlay isGhost={isGhost} />
      <GlitchOverlay isGhost={isGhost} />
      <SoundEngine />
      <NarratorEngine />
      {!isGhost && <DemonVoiceListener />}
      {!isGhost && <WhisperEngine />}

      {/* ── Title bar ──────────────────────────────────────── */}
      <TitleBar roomCode={roomCode} isGhost={isGhost} />

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Left sidebar + Editor */}
        <GameEditor isGhost={isGhost} roomCode={roomCode} />

        {/* Right sidebar */}
        {phase === "playing" && (
          <div className="w-68 bg-surface-deep border-l border-border flex flex-col shrink-0 overflow-y-auto">
            {/* Paranoia + Vote */}
            <div className="p-3 shrink-0">
              <GameHUD isGhost={isGhost} />
            </div>

            {/* Ghost-only: Taunts */}
            {isGhost && (
              <div className="border-t border-border shrink-0">
                <GhostTaunts />
              </div>
            )}

            {/* Ghost-only: Haunt Voice */}
            {isGhost && (
              <div className="border-t border-border shrink-0">
                <GhostHauntButton isGhost={isGhost} />
              </div>
            )}

            {/* Edit Log */}
            <div className="border-t border-border flex-1 min-h-0">
              <EditActivityLog />
            </div>
          </div>
        )}

        {/* Floating overlays */}
        <BreadcrumbToast />
      </div>
      <GameOverlay roomCode={roomCode} />
    </div>
  );
}
