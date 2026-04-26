"use client";

import { useGameStore } from "@/store/gameStore";
import {
  useMutation,
  useBroadcastEvent,
  useStorage,
} from "@liveblocks/react/suspense";
import { useState, useCallback, useEffect, useRef } from "react";
import { Bug, Undo2, Eye, Zap, EyeOff, Shuffle, Skull } from "lucide-react";

import { getTasksForRoom } from "@/lib/taskBank";

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
  const allTasks = getTasksForRoom(roomCode);
  const [cooldowns, setCooldowns] = useState<Record<string, boolean>>({});
  // Stores the expiry timestamp for each ability (ms since epoch)
  const [cooldownExpiry, setCooldownExpiry] = useState<Record<string, number>>(
    {},
  );
  // Live remaining seconds for display
  const [cooldownRemaining, setCooldownRemaining] = useState<
    Record<string, number>
  >({});
  const broadcast = useBroadcastEvent();
  const editorContent = useStorage((root) => root.editorContent);

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

  // ── 1. Inject Bug: revert a random fixed task to buggy ──────
  const injectBug = useMutation(
    ({ storage }) => {
      if (cooldowns["inject"]) return;
      const content = { ...storage.get("editorContent") };
      const fixedTasks = allTasks.filter((t) => {
        const raw = content[t.id];
        const code = typeof raw === "string" ? raw : t.buggyCode;
        return code.trim() === t.fixedCode.trim();
      });
      if (fixedTasks.length === 0) return;
      const target = fixedTasks[Math.floor(Math.random() * fixedTasks.length)];
      content[target.id] = target.buggyCode;
      storage.set("editorContent", content);
      increaseParanoia(5);
      startCooldown("inject", 20000);
    },
    [cooldowns, editorContent],
  );

  // ── 2. Fake Fix: make a task appear fixed for 15s ────────────
  const fakeFix = useMutation(
    ({ storage }) => {
      if (cooldowns["fake"]) return;
      const content = storage.get("editorContent");
      const unfixed = allTasks.filter((t) => {
        const raw = content[t.id];
        const code = typeof raw === "string" ? raw : t.buggyCode;
        return code.trim() !== t.fixedCode.trim();
      });
      if (unfixed.length === 0) return;
      const target = unfixed[Math.floor(Math.random() * unfixed.length)];
      const faked = { ...storage.get("fakedTasks") };
      faked[target.id] = Date.now() + 15000;
      storage.set("fakedTasks", faked);
      increaseParanoia(3);
      startCooldown("fake", 25000);
    },
    [cooldowns],
  );

  // ── 3. Blackout: 5s dark screen for engineers ────────────────
  const triggerBlackout = useCallback(() => {
    if (cooldowns["blackout"]) return;
    broadcast({ type: "blackout", duration: 5000 });
    increaseParanoia(8);
    startCooldown("blackout", 45000);
  }, [cooldowns, broadcast, increaseParanoia]);

  // ── 4. Phantom Cursor: fake cursor with random player color ──
  const spawnPhantom = useCallback(() => {
    if (cooldowns["phantom"]) return;
    const colors = ["#6d28d9", "#2563eb", "#059669", "#d97706"];
    const names = ["alice", "bob", "charlie", "dev_01"];
    broadcast({
      type: "phantom-cursor",
      line: Math.floor(Math.random() * 8) + 1,
      col: Math.floor(Math.random() * 30) + 5,
      color: colors[Math.floor(Math.random() * colors.length)],
      name: names[Math.floor(Math.random() * names.length)],
      duration: 6000,
    });
    increaseParanoia(2);
    startCooldown("phantom", 12000);
  }, [cooldowns, broadcast, increaseParanoia]);

  // ── 5. Subtle Corrupt: swap one char in a random task ────────
  const subtleCorrupt = useMutation(
    ({ storage }) => {
      if (cooldowns["corrupt"]) return;
      const content = { ...storage.get("editorContent") };
      const taskIds = Object.keys(content).filter((id) => {
        const task = allTasks.find((t) => t.id === id);
        if (!task) return false;
        const code = typeof content[id] === "string" ? content[id] : "";
        return (code as string).length > 10;
      });
      if (taskIds.length === 0) return;
      const targetId = taskIds[Math.floor(Math.random() * taskIds.length)];
      const code = content[targetId] as string;
      const swaps: Record<string, string> = {
        "===": "==",
        "==": "=",
        ";": "",
        "(": "[",
        ")": "]",
        const: "let",
        true: "false",
        ".": ",",
        "!==": "===",
      };
      const keys = Object.keys(swaps);
      for (const key of keys) {
        const idx = code.indexOf(key);
        if (idx !== -1) {
          content[targetId] =
            code.substring(0, idx) +
            swaps[key] +
            code.substring(idx + key.length);
          break;
        }
      }
      storage.set("editorContent", content);
      increaseParanoia(4);
      startCooldown("corrupt", 15000);
    },
    [cooldowns],
  );

  // ── 6. Variable Scrambler: rename variables in a random task ─
  const variableScrambler = useMutation(
    ({ storage }) => {
      if (cooldowns["scramble"]) return;
      const content = { ...storage.get("editorContent") };
      const taskIds = Object.keys(content).filter((id) => {
        return (
          allTasks.some((t) => t.id === id) && typeof content[id] === "string"
        );
      });
      if (taskIds.length === 0) return;
      const targetId = taskIds[Math.floor(Math.random() * taskIds.length)];
      let code = content[targetId] as string;
      // Scramble common variable names
      const renames: [RegExp, string][] = [
        [/\bnode\b/g, "nde"],
        [/\bresult\b/g, "reslt"],
        [/\bcurrent\b/g, "currnt"],
        [/\btarget\b/g, "targt"],
        [/\bvisited\b/g, "visted"],
        [/\bqueue\b/g, "queu"],
        [/\bhead\b/g, "hed"],
        [/\bdepth\b/g, "dpth"],
      ];
      const pick = renames[Math.floor(Math.random() * renames.length)];
      code = code.replace(pick[0], pick[1]);
      content[targetId] = code;
      storage.set("editorContent", content);
      increaseParanoia(6);
      startCooldown("scramble", 45000); // 45-second cooldown
    },
    [cooldowns],
  );

  if (phase !== "playing" || !isGhost) return null;

  const abilities = [
    {
      key: "inject",
      icon: Undo2,
      label: "Inject Bug",
      desc: "Revert a fixed task silently",
      action: () => injectBug(),
      cd: 20,
    },
    {
      key: "fake",
      icon: Eye,
      label: "Fake Fix",
      desc: "Task looks fixed for 15s",
      action: () => fakeFix(),
      cd: 25,
    },
    {
      key: "blackout",
      icon: EyeOff,
      label: "Blackout",
      desc: "5s dark screen for engineers",
      action: triggerBlackout,
      cd: 45,
    },
    {
      key: "phantom",
      icon: Zap,
      label: "Phantom",
      desc: "Spawn a fake player cursor",
      action: spawnPhantom,
      cd: 12,
    },
    {
      key: "corrupt",
      icon: Bug,
      label: "Corrupt",
      desc: "Swap a character in code",
      action: () => subtleCorrupt(),
      cd: 15,
    },
    {
      key: "scramble",
      icon: Shuffle,
      label: "Scrambler",
      desc: "Rename variables in code",
      action: () => variableScrambler(),
      cd: 45,
    },
  ];

  return (
    <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-50 font-mono">
      <div className="bg-[#09090b]/95 backdrop-blur-xl border border-[#ef4444]/40 rounded-sm p-4 shadow-[0_0_30px_rgba(239,68,68,0.15)]">
        <div className="flex items-center gap-2 mb-3 px-1 border-b border-[#ef4444]/20 pb-2">
          <Skull
            size={14}
            className="text-[#ef4444] animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"
          />
          <span className="text-[11px] font-black text-[#ef4444] uppercase tracking-[0.25em] drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
            Ghost Control Protocol
          </span>
        </div>
        <div className="flex gap-2">
          {abilities.map(({ key, icon: Icon, label, desc, action, cd }) => (
            <button
              key={key}
              onClick={action}
              disabled={cooldowns[key]}
              title={desc}
              className={`flex flex-col items-center justify-center gap-1.5 w-24 h-20 rounded-sm text-[10px] uppercase font-bold tracking-widest transition-all ${
                cooldowns[key]
                  ? "bg-[#18181b]/50 text-[#52525b] border border-[#27272a]/50 cursor-not-allowed"
                  : "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 hover:text-white border border-[#ef4444]/30 hover:border-[#ef4444]/60 shadow-[0_0_10px_rgba(239,68,68,0.1)] hover:shadow-[0_0_15px_rgba(239,68,68,0.3)]"
              }`}
            >
              <Icon
                size={18}
                className={
                  !cooldowns[key] ? "drop-shadow-[0_0_3px_currentColor]" : ""
                }
              />
              <span className="text-center px-1 leading-tight">{label}</span>
              {cooldowns[key] && (
                <span className="text-[9px] text-[#ef4444]/50 mt-1 tabular-nums">
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
