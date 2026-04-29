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
    <div className="">
      <div className="flex items-center gap-1.5">
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
          className={`p-1.5 rounded-lg transition-all border ${
            !micAllowed
              ? "bg-surface-raised text-text-faint border-border cursor-not-allowed"
              : hauntActive
                ? "bg-ghost/10 text-ghost border-ghost/20 cursor-not-allowed"
                : micMuted
                  ? "bg-ghost/10 text-ghost-light border-ghost/20 hover:bg-ghost/15"
                  : "bg-surface-raised text-text-muted border-border hover:text-text-primary hover:border-surface-hover"
          }`}
        >
          {micMuted || hauntActive || !micAllowed ? (
            <MicOff size={14} />
          ) : (
            <Mic size={14} />
          )}
        </button>

        {/* Mute others' voice */}
        <button
          onClick={toggleOthers}
          title={othersMuted ? "Unmute others" : "Mute others' voice"}
          className={`p-1.5 rounded-lg transition-all border ${
            othersMuted
              ? "bg-ghost/10 text-ghost-light border-ghost/20 hover:bg-ghost/15"
              : "bg-surface-raised text-text-muted border-border hover:text-text-primary hover:border-surface-hover"
          }`}
        >
          {othersMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
        </button>
      </div>
    </div>
  );
}
