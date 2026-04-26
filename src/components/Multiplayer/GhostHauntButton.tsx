"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import {
  useBroadcastEvent,
  useEventListener,
  useSelf,
} from "@liveblocks/react/suspense";
import { Ghost, Radio } from "lucide-react";
import { useGameStore } from "@/store/gameStore";

interface GhostHauntButtonProps {
  isGhost: boolean;
}

/**
 * Ghost-only "Hold to Speak" button.
 *
 * When held:
 *  1. Records the Ghost's mic via MediaRecorder
 *  2. Sends the audio blob to /api/voice (ElevenLabs STS)
 *  3. Gets back a "demon voice" audio buffer
 *  4. Broadcasts the base64-encoded audio to all players via Liveblocks
 *  5. Every client (including engineers) plays the demon voice
 */
export function GhostHauntButton({ isGhost }: GhostHauntButtonProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordStartRef = useRef(0);
  const self = useSelf();

  const broadcast = useBroadcastEvent();

  // ── All players: listen for demon voice broadcasts ───────────
  useEventListener(({ event }) => {
    if (event.type === "demon-voice") {
      playBase64Audio(event.audioBase64);
    }
  });

  const playBase64Audio = (base64: string) => {
    try {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([bytes], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 0.8;
      audio.play();
      audio.onended = () => URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to play demon voice:", err);
    }
  };

  // ── Ghost only: record + process + broadcast ─────────────────
  const startRecording = useCallback(async () => {
    if (!isGhost) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());

        // Skip if recording was too short (ElevenLabs needs >= 0.5s)
        const recordingMs = Date.now() - recordStartRef.current;
        if (recordingMs < 500) {
          console.warn("Recording too short, skipping voice processing");
          setIsProcessing(false);
          return;
        }

        // Send to ElevenLabs via our API route
        setIsProcessing(true);
        try {
          const formData = new FormData();
          formData.append("audio", audioBlob);
          // Send elapsed time for Audio Climax feature
          const elapsed = 240 - useGameStore.getState().timeRemaining;
          formData.append("elapsed", elapsed.toString());

          const res = await fetch("/api/voice", {
            method: "POST",
            body: formData,
          });

          if (!res.ok) {
            const errBody = await res.text();
            console.error("Voice API error:", res.status, errBody);
            return;
          }

          const demonBuffer = await res.arrayBuffer();

          // Convert to base64 for broadcasting
          const base64 = btoa(
            String.fromCharCode(...new Uint8Array(demonBuffer)),
          );

          // Broadcast to all players in the room
          broadcast({
            type: "demon-voice",
            audioBase64: base64,
            senderName: self?.presence.name ?? "Ghost",
          });

          // Also play locally for the ghost
          playBase64Audio(base64);
        } catch (err) {
          console.error("Demon voice pipeline failed:", err);
        } finally {
          setIsProcessing(false);
        }
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      recordStartRef.current = Date.now();
      setIsRecording(true);
    } catch (err) {
      console.error("Mic access failed:", err);
    }
  }, [isGhost, broadcast, self?.presence.name]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  // Engineers still mount this component (to receive broadcasts)
  // but don't see the button
  if (!isGhost) return null;

  return (
    <div className="absolute bottom-4 right-4 z-50 font-mono">
      <div className="bg-[#09090b]/95 backdrop-blur-xl border border-[#ef4444]/40 rounded-sm p-4 shadow-[0_0_30px_rgba(239,68,68,0.15)] max-w-[200px]">
        <div className="flex items-center gap-2 mb-3 px-1 border-b border-[#ef4444]/20 pb-2">
          <Ghost size={14} className="text-[#ef4444] animate-pulse drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
          <span className="text-[11px] font-black text-[#ef4444] uppercase tracking-[0.25em] drop-shadow-[0_0_5px_rgba(239,68,68,0.5)]">
            Haunt Voice
          </span>
        </div>

        <button
          onMouseDown={startRecording}
          onMouseUp={stopRecording}
          onMouseLeave={stopRecording}
          onTouchStart={startRecording}
          onTouchEnd={stopRecording}
          disabled={isProcessing}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-sm text-xs font-bold uppercase tracking-widest transition-all ${
            isRecording
              ? "bg-[#ef4444]/20 text-[#ef4444] border border-[#ef4444]/60 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              : isProcessing
                ? "bg-[#18181b]/50 text-[#52525b] cursor-wait border border-[#27272a]/50"
                : "bg-[#ef4444]/10 text-[#ef4444] hover:bg-[#ef4444]/20 hover:text-white border border-[#ef4444]/30 hover:border-[#ef4444]/60 shadow-[0_0_10px_rgba(239,68,68,0.1)]"
          }`}
        >
          {isRecording ? (
            <>
              <Radio size={16} className="animate-pulse" />
              Recording
            </>
          ) : isProcessing ? (
            <>
              <div className="w-4 h-4 border-2 border-[#ef4444]/40 border-t-transparent rounded-full animate-spin" />
              Distorting
            </>
          ) : (
            <>
              <Ghost size={16} className="drop-shadow-[0_0_3px_currentColor]" />
              Hold to Speak
            </>
          )}
        </button>

        <p className="text-[9px] text-[#ef4444]/50 text-center mt-3 font-medium uppercase tracking-wider leading-tight">
          Your voice will be distorted and played for all engineers
        </p>
      </div>
    </div>
  );
}
