"use client";

import { useGameStore } from "@/store/gameStore";
import {
  useMutation,
  useBroadcastEvent,
  useStorage,
  useOthers,
} from "@liveblocks/react/suspense";
import { useState, useCallback, useEffect, useRef } from "react";
import { Undo2, Eye, Zap, EyeOff, Skull } from "lucide-react";

import { useGameScenario } from "@/lib/useGameScenario";
import { getInvalidationCascade } from "@/lib/chainValidator";
import { pickBreadcrumb } from "@/lib/breadcrumbs";

interface GhostControlsProps {
  isGhost: boolean;
  roomCode: string;
}

/**
 * Ghost abilities panel — activated with backtick (`) key.
 * All abilities are SILENT — no terminal messages, no alerts to engineers.
 */
export function GhostControls({ isGhost, roomCode }: GhostControlsProps) {
  const { phase, increaseParanoia } = useGameStore();
  const { files, dependencyGraph } = useGameScenario(roomCode);
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  const [cooldownExpiry, setCooldownExpiry] = useState<Record<string, number>>(
    {},
  );
  const [cooldownRemaining, setCooldownRemaining] = useState<
    Record<string, number>
  >({});
  const broadcast = useBroadcastEvent();
  const editorContent = useStorage((root) => root.editorContent);
  const fileVerification = useStorage((root) => root.fileVerification);
  const others = useOthers();

  // Tick every second to update remaining cooldown display
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const remaining: Record<string, number> = {};
      const active: Record<string, boolean> = {};
      for (const [key, expiry] of Object.entries(cooldownExpiry)) {
        const left = Math.ceil((expiry - now) / 1000);
        if (left > 0) {
          remaining[key] = left;
          active[key] = true;
        }
      }
      setCooldownRemaining(remaining);
      setCooldowns(active);
    }, 250);
    return () => clearInterval(interval);
  }, [cooldownExpiry]);

  const startCooldown = (key: string, ms: number) => {
    setCooldownExpiry((prev) => ({ ...prev, [key]: Date.now() + ms }));
    setCooldowns((prev) => ({ ...prev, [key]: true }));
  };

  // Track last blamed engineer to avoid repeats
  const lastBlamedRef = useRef<string | undefined>(undefined);
  const othersRef = useRef(others);
  const broadcastRef = useRef(broadcast);
  useEffect(() => {
    othersRef.current = others;
  }, [others]);
  useEffect(() => {
    broadcastRef.current = broadcast;
  }, [broadcast]);

  /** Broadcast a false breadcrumb blaming a random engineer */
  const sendBreadcrumb = useCallback((ability: string) => {
    const engineerNames = othersRef.current
      .map((o) => o.presence.name as string)
      .filter((n) => n !== "");

    const result = pickBreadcrumb(
      ability,
      engineerNames,
      lastBlamedRef.current,
    );
    if (!result) return;

    lastBlamedRef.current = result.blamedName;

    const delay = 500 + Math.random() * 1500;
    setTimeout(() => {
      broadcastRef.current({ type: "breadcrumb", message: result.message });
    }, delay);
  }, []);

  // ── 1. Inject Bug: revert a verified file to buggy + cascade invalidation ──
  const injectBug = useMutation(
    ({ storage }) => {
      if (cooldowns["inject"]) return;
      const content = { ...storage.get("editorContent") };
      const verification = storage.get("fileVerification");

      // Find files that are verified or have been fixed
      const fixedFiles = files.filter((f) => {
        if (verification[f.id]?.verified) return true;
        const raw = content[f.id];
        const code = typeof raw === "string" ? raw : f.buggyCode;
        return (
          code.trim().replace(/\s+/g, " ") ===
          f.fixedCode.trim().replace(/\s+/g, " ")
        );
      });

      if (fixedFiles.length === 0) return;
      const target = fixedFiles[Math.floor(Math.random() * fixedFiles.length)];

      // Revert to buggy code
      content[target.id] = target.buggyCode;
      storage.set("editorContent", content);

      // Cascade invalidation: target + all dependents
      const cascade = getInvalidationCascade(target.id, dependencyGraph);
      const updatedVerification = { ...verification };
      for (const id of cascade) {
        delete updatedVerification[id];
      }
      storage.set("fileVerification", updatedVerification);
      storage.set("systemStatus", "degraded");

      increaseParanoia(5);
      startCooldown("inject", 20000);
    },
    [cooldowns, files, dependencyGraph],
  );

  // ── 2. Fake Fix: make a file appear verified for 15s ────────────
  const fakeFix = useMutation(
    ({ storage }) => {
      if (cooldowns["fake"]) return;
      const verification = storage.get("fileVerification");

      // Find unverified files
      const unverified = files.filter((f) => !verification[f.id]?.verified);
      if (unverified.length === 0) return;

      const target = unverified[Math.floor(Math.random() * unverified.length)];

      // Use fakedTasks storage (reusing existing mechanism) for the 15s fake
      const faked = { ...storage.get("fakedTasks") };
      faked[target.id] = Date.now() + 15000;
      storage.set("fakedTasks", faked);

      increaseParanoia(3);
      startCooldown("fake", 25000);
    },
    [cooldowns, files],
  );

  // ── 3. Blackout: 5s dark screen for engineers ────────────────
  const triggerBlackout = useCallback(() => {
    if (cooldowns["blackout"]) return;
    broadcast({ type: "blackout", duration: 5000 });
    increaseParanoia(8);
    startCooldown("blackout", 45000);
  }, [cooldowns, broadcast, increaseParanoia]);

  // ── 4. Phantom Cursor: fake cursor with a real player's name/color ──
  const spawnPhantom = useCallback(() => {
    if (cooldowns["phantom"]) return;
    const players = others
      .map((o) => ({
        name: o.presence.name as string,
        color: o.presence.color as string,
      }))
      .filter((p) => p.name);
    const fallback = { name: "engineer", color: "#6d28d9" };
    const pick =
      players.length > 0
        ? players[Math.floor(Math.random() * players.length)]
        : fallback;
    broadcast({
      type: "phantom-cursor",
      line: Math.floor(Math.random() * 8) + 1,
      col: Math.floor(Math.random() * 30) + 5,
      color: pick.color,
      name: pick.name,
      duration: 6000,
    });
    increaseParanoia(2);
    startCooldown("phantom", 12000);
  }, [cooldowns, broadcast, increaseParanoia, others]);

  if (phase !== "playing" || !isGhost) return null;

  const abilities = [
    {
      key: "inject",
      icon: Undo2,
      label: "Inject Bug",
      desc: "Revert a fixed file + cascade",
      abilityFn: injectBug,
    },
    {
      key: "fake",
      icon: Eye,
      label: "Fake Fix",
      desc: "File looks verified for 15s",
      abilityFn: fakeFix,
    },
    {
      key: "blackout",
      icon: EyeOff,
      label: "Blackout",
      desc: "5s dark screen for engineers",
      abilityFn: triggerBlackout,
    },
    {
      key: "phantom",
      icon: Zap,
      label: "Fake Cursor",
      desc: "Spawn a fake player cursor",
      abilityFn: spawnPhantom,
    },
  ];

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 font-mono">
      <div className="bg-surface-raised/95 backdrop-blur-xl border border-ghost/50 rounded-sm p-4 shadow-ghost">
        <div className="flex items-center gap-2 mb-3 px-1 border-b border-ghost/30 pb-2">
          <Skull size={14} className="text-ghost animate-pulse" />
          <span className="text-[11px] font-black text-ghost uppercase tracking-[0.25em]">
            Ghost Control Protocol
          </span>
        </div>
        <div className="flex gap-2">
          {abilities.map(({ key, icon: Icon, label, desc, abilityFn }) => (
            <button
              key={key}
              onClick={() => {
                abilityFn();
                sendBreadcrumb(key);
              }}
              disabled={cooldowns[key]}
              title={desc}
              className={`flex flex-col items-center justify-center gap-1.5 w-24 h-20 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-all ${
                cooldowns[key]
                  ? "bg-surface/50 text-text-faint border border-border/50 cursor-not-allowed"
                  : "bg-ghost/10 text-ghost hover:bg-ghost/20 hover:text-white border border-ghost/30 hover:border-ghost/60 hover:shadow-ghost-strong"
              }`}
            >
              <Icon size={18} />
              <span className="text-center px-1 leading-tight">{label}</span>
              {cooldowns[key] && (
                <span className="text-[9px] text-ghost/50 mt-1 tabular-nums">
                  {cooldownRemaining[key] || 0}s
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
