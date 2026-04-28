"use client";

import { useEffect, useRef } from "react";
import {
  useStorage,
  useSelf,
  useOthers,
  useMutation,
} from "@liveblocks/react/suspense";
import { GameEditor } from "@/components/Editor/GameEditor";
import { StatusBar } from "@/components/Editor/StatusBar";
import { GameHUD } from "@/components/Editor/GameHUD";
import { GhostControls } from "@/components/Editor/GhostControls";
import { GameOverlay } from "@/components/Editor/GameOverlay";
import { GhostHauntButton } from "@/components/Multiplayer/GhostHauntButton";
import { GhostTaunts } from "@/components/Multiplayer/GhostTaunts";
import { DemonVoiceListener } from "@/components/Multiplayer/DemonVoiceListener";
import { RoleBanner } from "@/components/Editor/RoleBanner";

import { BlackoutOverlay } from "@/components/Editor/BlackoutOverlay";
import { ParanoiaEffects } from "@/components/Editor/ParanoiaEffects";
import { SoundEngine } from "@/components/Editor/SoundEngine";
import { WhisperEngine } from "@/components/Editor/WhisperEngine";
import { BreadcrumbToast } from "@/components/Editor/BreadcrumbToast";
import { EditActivityLog } from "@/components/Editor/EditActivityLog";
import { useGameStore } from "@/store/gameStore";
import { playGameOver } from "@/lib/sounds";
import { MAX_GAME_DURATION_MS } from "@/lib/roomCode";
import { useGameScenario } from "@/lib/useGameScenario";

interface EditorWorkspaceProps {
  roomCode: string;
}

export function EditorWorkspace({ roomCode }: EditorWorkspaceProps) {
  const gameStatus = useStorage((root) => root.gameStatus);
  const ghostId = useStorage((root) => root.ghostId);
  const systemStatus = useStorage((root) => root.systemStatus);
  const fileVerification = useStorage((root) => root.fileVerification);
  const self = useSelf();
  const others = useOthers();
  const { paranoiaMeter, ghostEvents, startGame, phase, endGame } =
    useGameStore();
  const { scenario } = useGameScenario(roomCode);

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
      className={`h-screen w-screen flex flex-col overflow-hidden bg-surface-deep font-mono ${
        paranoiaMeter > 80 ? "paranoia-border" : ""
      } ${hasScanline ? "scanline-overlay" : ""}`}
    >
      <RoleBanner isGhost={isGhost} />
      <ParanoiaEffects />
      <BlackoutOverlay isGhost={isGhost} />
      <SoundEngine />
      {!isGhost && <DemonVoiceListener />}
      {!isGhost && <WhisperEngine />}

      {/* Title bar */}
      <div className="h-8 bg-surface-deep border-b border-border/80 flex items-center px-4 shrink-0 select-none shadow-sm z-10 relative">
        <div className="flex items-center gap-2 mr-4">
          <div className="w-2.5 h-2.5 rounded-full bg-ghost shadow-ghost" />
          <div className="w-2.5 h-2.5 rounded-full bg-warning shadow-warning" />
          <div className="w-2.5 h-2.5 rounded-full bg-success shadow-success" />
        </div>
        <span className="text-[10px] text-text-faint flex-1 text-center uppercase tracking-widest">
          Ghost in the Machine —{" "}
          <span className="text-accent-soft">{roomCode}</span>
        </span>
        <div className="w-16" />
      </div>

      {/* Scenario narrative banner + system status */}
      {phase === "playing" && scenario && (
        <div className="shrink-0 px-4 py-2 bg-warning/5 border-b border-warning/30 flex items-center gap-3 z-10">
          <span
            className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-sm border ${
              systemStatus === "operational"
                ? "text-success bg-success/10 border-success/30"
                : "text-warning bg-warning/10 border-warning/30"
            }`}
          >
            {systemStatus === "operational" ? "OPERATIONAL" : "DEGRADED"}{" "}
            {
              Object.values(fileVerification ?? {}).filter(
                (v) =>
                  v != null &&
                  typeof v === "object" &&
                  "verified" in v &&
                  (v as { verified: boolean }).verified,
              ).length
            }
            /{scenario.files.length}
          </span>
          <span className="text-[10px] text-text-muted uppercase tracking-wider truncate">
            {scenario.description}
          </span>
        </div>
      )}

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden relative">
        <GameEditor isGhost={isGhost} roomCode={roomCode} />
        <GhostControls isGhost={isGhost} roomCode={roomCode} />
        <BreadcrumbToast />
        {/* Right-side column — HUD fixed at top, panels scroll below */}
        {phase === "playing" && (
          <div className="absolute top-4 bottom-4 right-4 z-60 flex flex-col gap-3 items-end pointer-events-none">
            <div className="pointer-events-auto shrink-0">
              <GameHUD isGhost={isGhost} />
            </div>
            <div className="flex flex-col gap-3 items-end overflow-y-auto min-h-0 flex-1">
              {isGhost && (
                <div className="pointer-events-auto shrink-0">
                  <GhostTaunts />
                </div>
              )}
              <div className="pointer-events-auto shrink-0">
                <GhostHauntButton isGhost={isGhost} />
              </div>
              <div className="pointer-events-auto shrink-0">
                <EditActivityLog />
              </div>
            </div>
          </div>
        )}
      </div>

      <GameOverlay roomCode={roomCode} />
    </div>
  );
}
