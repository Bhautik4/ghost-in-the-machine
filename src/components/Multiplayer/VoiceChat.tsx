"use client";

import { useGameStore } from "@/store/gameStore";
import { useState, useEffect, useCallback, useRef } from "react";
import { useUpdateMyPresence } from "@liveblocks/react/suspense";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import { voiceManager } from "@/lib/voiceManager";
import { useVoiceSignaling } from "@/lib/voiceSignaling";

interface VoiceChatProps {
  isGhost: boolean;
}

/**
 * Minimal voice chat UI — two buttons: mute mic, mute others' audio.
 *
 * Mic permission is requested automatically on mount.
 * If denied, the player can still hear others but can't speak.
 * "Mute others" only affects peer voice — game sounds (demon voice,
 * SFX, narrator, whispers) are untouched.
 *
 * For the ghost: mic is auto-muted while a haunt voice is active
 * (recording or processing) to prevent real voice leaking through.
 * This is driven by the `ghostHauntActive` flag on voiceManager.
 */
export function VoiceChat({ isGhost }: VoiceChatProps) {
  const { phase } = useGameStore();
  const updatePresence = useUpdateMyPresence();

  const [micAllowed, setMicAllowed] = useState(false);
  const [micMuted, setMicMuted] = useState(false);
  const [othersMuted, setOthersMuted] = useState(false);
  const [hauntActive, setHauntActive] = useState(false);
  const manualMuteRef = useRef(false);

  // Enable signaling as soon as mic is allowed (or even if denied — for listening)
  const [voiceReady, setVoiceReady] = useState(false);
  useVoiceSignaling(voiceReady);

  // Auto-request mic on mount
  useEffect(() => {
    if (phase !== "playing") return;

    let cancelled = false;
    (async () => {
      const ok = await voiceManager.requestMicrophone();
      if (cancelled) return;
      setMicAllowed(ok);
      setVoiceReady(true);
      updatePresence({ voiceEnabled: true });
    })();

    return () => {
      cancelled = true;
    };
  }, [phase, updatePresence]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      voiceManager.releaseMicrophone();
    };
  }, []);

  // Toggle mic mute
  const toggleMic = useCallback(() => {
    const next = !micMuted;
    setMicMuted(next);
    manualMuteRef.current = next;
    voiceManager.setMuted(next);
  }, [micMuted]);

  // Toggle others' audio
  const toggleOthers = useCallback(() => {
    const next = !othersMuted;
    setOthersMuted(next);
    // Mute/unmute all peer gain nodes
    for (const peerId of voiceManager.connectedPeerIds) {
      voiceManager.setVolume(peerId, next ? 0 : 1);
    }
  }, [othersMuted]);

  // Ghost auto-mute: listen for haunt active state changes
  useEffect(() => {
    if (!isGhost) return;

    const check = () => {
      const active = voiceManager.isHauntActive;
      setHauntActive(active);
      if (active) {
        // Auto-mute mic during haunt
        voiceManager.setMuted(true);
      } else {
        // Restore to manual state after haunt ends
        voiceManager.setMuted(manualMuteRef.current);
      }
    };

    voiceManager.on("haunt-state-change", check);
    return () => voiceManager.off("haunt-state-change", check);
  }, [isGhost]);

  if (phase !== "playing") return null;

  return (
    <div className="absolute bottom-4 right-4 z-50 font-mono">
      <div className="flex items-center gap-1.5 bg-surface/90 backdrop-blur-md border border-border/50 rounded-sm p-1.5 shadow-xl">
        {/* Mute my mic */}
        <button
          onClick={toggleMic}
          disabled={!micAllowed || hauntActive}
          title={
            !micAllowed
              ? "Mic not available"
              : hauntActive
                ? "Mic muted during haunt"
                : micMuted
                  ? "Unmute mic"
                  : "Mute mic"
          }
          className={`p-2 rounded-sm transition-all border ${
            !micAllowed
              ? "bg-surface-deep/50 text-text-faint border-border/30 cursor-not-allowed"
              : hauntActive
                ? "bg-ghost/10 text-ghost border-ghost/30 cursor-not-allowed"
                : micMuted
                  ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
                  : "bg-surface-deep text-text-muted border-border/50 hover:text-text-primary hover:border-border"
          }`}
        >
          {micMuted || hauntActive || !micAllowed ? (
            <MicOff size={16} />
          ) : (
            <Mic size={16} />
          )}
        </button>

        {/* Mute others' voice */}
        <button
          onClick={toggleOthers}
          title={othersMuted ? "Unmute others" : "Mute others' voice"}
          className={`p-2 rounded-sm transition-all border ${
            othersMuted
              ? "bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20"
              : "bg-surface-deep text-text-muted border-border/50 hover:text-text-primary hover:border-border"
          }`}
        >
          {othersMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
      </div>
    </div>
  );
}
