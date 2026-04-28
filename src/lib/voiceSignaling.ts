/**
 * useVoiceSignaling — bridges VoiceManager with Liveblocks broadcast events.
 *
 * Uses the "polite/impolite" peer pattern to resolve simultaneous offer
 * collisions. The player with the lexicographically lower ID is "polite" —
 * if they receive an incoming offer while they have a pending outgoing offer,
 * they drop theirs and accept the incoming one. The "impolite" peer ignores
 * incoming offers when they already have a pending offer.
 */

"use client";

import { useEffect, useCallback, useRef } from "react";
import {
  useBroadcastEvent,
  useEventListener,
  useSelf,
  useOthers,
  useUpdateMyPresence,
} from "@liveblocks/react/suspense";
import { voiceManager } from "./voiceManager";

export function useVoiceSignaling(enabled: boolean) {
  const broadcast = useBroadcastEvent();
  const self = useSelf();
  const others = useOthers();
  const updatePresence = useUpdateMyPresence();
  const myPlayerId = self?.presence.playerId ?? "";

  // Keep refs to avoid stale closures
  const broadcastRef = useRef(broadcast);
  const myPlayerIdRef = useRef(myPlayerId);
  useEffect(() => {
    broadcastRef.current = broadcast;
  }, [broadcast]);
  useEffect(() => {
    myPlayerIdRef.current = myPlayerId;
    voiceManager.setLocalPlayerId(myPlayerId);
  }, [myPlayerId]);

  // Helper: send ICE candidates for a peer
  const setupIceCandidates = useCallback((peerId: string) => {
    voiceManager.onIceCandidate(peerId, (candidate) => {
      broadcastRef.current({
        type: "voice-ice",
        targetPlayerId: peerId,
        fromPlayerId: myPlayerIdRef.current,
        candidate: JSON.stringify(candidate),
      });
    });
  }, []);

  // ── Initiate connections to all voice-enabled peers ──
  const connectToPeers = useCallback(async () => {
    if (!enabled || !myPlayerId) return;

    const voicePeers = others.filter((o) => o.presence.voiceEnabled);
    for (const peer of voicePeers) {
      const peerId = peer.presence.playerId;
      if (!peerId || voiceManager.connectedPeerIds.includes(peerId)) continue;

      try {
        const offer = await voiceManager.createOffer(peerId);
        setupIceCandidates(peerId);
        broadcastRef.current({
          type: "voice-offer",
          targetPlayerId: peerId,
          fromPlayerId: myPlayerIdRef.current,
          offer: JSON.stringify(offer),
        });
      } catch (err) {
        console.warn(
          `[VoiceSignaling] Failed to create offer for ${peerId}:`,
          err,
        );
      }
    }
  }, [enabled, myPlayerId, others, setupIceCandidates]);

  // Connect when voice is enabled or when new voice peers appear
  useEffect(() => {
    if (enabled) {
      connectToPeers();
    }
  }, [enabled, connectToPeers]);

  // ── Handle incoming signaling events ──
  useEventListener(({ event }) => {
    if (!enabled || !myPlayerId) return;

    if (event.type === "voice-offer" && event.targetPlayerId === myPlayerId) {
      const fromId = event.fromPlayerId;

      // Glare resolution: both sides sent offers simultaneously
      if (voiceManager.hasPendingOffer(fromId)) {
        if (!voiceManager.isPolite(fromId)) {
          // We are impolite → ignore their offer, they'll accept our answer
          return;
        }
        // We are polite → drop our pending offer, accept theirs
        voiceManager.disconnectPeer(fromId);
      }

      (async () => {
        try {
          const offer = JSON.parse(event.offer) as RTCSessionDescriptionInit;
          const answer = await voiceManager.handleOffer(fromId, offer);
          setupIceCandidates(fromId);
          broadcastRef.current({
            type: "voice-answer",
            targetPlayerId: fromId,
            fromPlayerId: myPlayerIdRef.current,
            answer: JSON.stringify(answer),
          });
        } catch (err) {
          console.warn("[VoiceSignaling] Failed to handle offer:", err);
        }
      })();
    }

    if (event.type === "voice-answer" && event.targetPlayerId === myPlayerId) {
      const answer = JSON.parse(event.answer) as RTCSessionDescriptionInit;
      voiceManager.handleAnswer(event.fromPlayerId, answer);
    }

    if (event.type === "voice-ice" && event.targetPlayerId === myPlayerId) {
      const candidate = JSON.parse(event.candidate) as RTCIceCandidateInit;
      voiceManager.addIceCandidate(event.fromPlayerId, candidate);
    }

    if (event.type === "voice-disconnect") {
      voiceManager.disconnectPeer(event.fromPlayerId);
    }
  });

  // ── Clean up departed players ──
  const otherPlayerIds = others.map((o) => o.presence.playerId);
  useEffect(() => {
    for (const peerId of voiceManager.connectedPeerIds) {
      if (!otherPlayerIds.includes(peerId)) {
        voiceManager.disconnectPeer(peerId);
      }
    }
  }, [otherPlayerIds]);

  // ── Disconnect broadcast on unmount ──
  useEffect(() => {
    return () => {
      if (enabled && myPlayerIdRef.current) {
        broadcastRef.current({
          type: "voice-disconnect",
          fromPlayerId: myPlayerIdRef.current,
        });
        voiceManager.releaseMicrophone();
      }
    };
  }, [enabled]);

  return {
    connectToPeers,
  };
}
