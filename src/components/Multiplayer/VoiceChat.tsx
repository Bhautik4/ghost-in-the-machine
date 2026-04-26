"use client";

import { useGameStore } from "@/store/gameStore";
import { useState, useRef, useCallback } from "react";
import { Mic, Volume2, VolumeX, Radio } from "lucide-react";

interface VoiceChatProps {
  isGhost: boolean;
}

export function VoiceChat({ isGhost }: VoiceChatProps) {
  const { phase } = useGameStore();
  const [isRecording, setIsRecording] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const playAudio = (blob: Blob) => {
    if (isMuted) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
    audio.onended = () => URL.revokeObjectURL(url);
  };

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: "audio/webm;codecs=opus",
      });

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(chunksRef.current, { type: "audio/webm" });

        // If ghost, send through ElevenLabs STS for distortion
        if (isGhost) {
          setIsProcessing(true);
          try {
            const formData = new FormData();
            formData.append("audio", audioBlob);

            const response = await fetch("/api/voice", {
              method: "POST",
              body: formData,
            });

            if (response.ok) {
              const distortedAudio = await response.blob();
              playAudio(distortedAudio);
            }
          } catch (err) {
            console.error("Voice processing failed:", err);
          } finally {
            setIsProcessing(false);
          }
        } else {
          playAudio(audioBlob);
        }

        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorder.start(100);
      mediaRecorderRef.current = mediaRecorder;
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording:", err);
    }
  }, [isGhost]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === "recording") {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }, []);

  if (phase !== "playing") return null;

  return (
    <div className="absolute bottom-4 right-4 z-50 font-mono">
      <div className="bg-[#18181b]/90 backdrop-blur-md border border-[#27272a]/50 rounded-sm p-3 shadow-xl">
        <div className="flex items-center gap-2">
          {/* Record button */}
          <button
            onMouseDown={startRecording}
            onMouseUp={stopRecording}
            onMouseLeave={stopRecording}
            disabled={isProcessing}
            className={`flex items-center justify-center gap-2 px-3 py-2 rounded-sm transition-all text-xs font-bold uppercase tracking-wider ${
              isRecording
                ? "bg-[#6d28d9]/20 text-[#a78bfa] border border-[#6d28d9]/50 shadow-[0_0_10px_rgba(109,40,217,0.3)]"
                : isProcessing
                  ? "bg-[#09090b]/50 text-[#52525b] cursor-wait border border-[#27272a]/50"
                  : "bg-[#09090b] text-[#a1a1aa] border border-[#27272a]/50 hover:bg-[#27272a]/50 hover:text-[#e4e4e7]"
            }`}
            title="Hold to talk"
          >
            {isRecording ? (
              <Radio size={14} className="animate-pulse drop-shadow-[0_0_3px_currentColor]" />
            ) : isProcessing ? (
              <div className="w-3.5 h-3.5 border-2 border-[#52525b] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Mic size={14} />
            )}
            {isRecording ? "Live" : "Talk"}
          </button>

          {/* Mute toggle */}
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2 rounded-sm transition-all border ${
              isMuted
                ? "bg-[#ef4444]/10 text-[#ef4444] border-[#ef4444]/30 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
                : "bg-[#09090b] text-[#a1a1aa] border-[#27272a]/50 hover:bg-[#27272a]/50 hover:text-[#e4e4e7]"
            }`}
            title={isMuted ? "Unmute" : "Mute"}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
        </div>

        <div className="text-[9px] text-center mt-2 text-[#71717a] font-bold uppercase tracking-widest">
          {isRecording
            ? "Transmitting"
            : isProcessing
              ? "Processing"
              : "Voice Comms"}
        </div>

        {isGhost && (
          <div className="text-[8px] text-center text-[#ef4444]/60 mt-1 uppercase tracking-wider font-bold">
            Distortion Active
          </div>
        )}
      </div>
    </div>
  );
}
