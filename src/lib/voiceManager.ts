/**
 * VoiceManager — singleton managing all WebRTC peer connections for voice chat.
 *
 * Each player maintains a RTCPeerConnection to every other player (mesh topology).
 * Audio streams flow directly peer-to-peer. Incoming audio is routed through
 * Web Audio API nodes for game effects (paranoia distortion, blackout, etc.).
 */

const ICE_SERVERS: RTCIceServer[] = [
  { urls: "stun:stun.l.google.com:19302" },
  { urls: "stun:stun1.l.google.com:19302" },
];

interface PeerState {
  connection: RTCPeerConnection;
  /** Web Audio nodes for this peer's incoming audio */
  source: MediaStreamAudioSourceNode | null;
  gain: GainNode;
  filter: BiquadFilterNode;
  analyser: AnalyserNode;
  /** The <audio> element used to play this peer's stream (Safari compat) */
  audioEl: HTMLAudioElement | null;
}

export type VoiceConnectionStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "failed";

export type VoiceEventType =
  | "status-change"
  | "peer-connected"
  | "peer-disconnected"
  | "speaking-change"
  | "haunt-state-change";

type VoiceEventCallback = (data: {
  peerId?: string;
  status?: VoiceConnectionStatus;
  speaking?: boolean;
}) => void;

class VoiceManager {
  private peers = new Map<string, PeerState>();
  private localStream: MediaStream | null = null;
  /** Processed stream sent to peers (noise-filtered + boosted) */
  private processedStream: MediaStream | null = null;
  private audioContext: AudioContext | null = null;
  private muted = false;
  private listeners = new Map<VoiceEventType, Set<VoiceEventCallback>>();
  private speakingState = new Map<string, boolean>();
  private speakingRafId: number | null = null;
  private paranoiaLevel = 0;
  private blackoutActive = false;
  private _hauntActive = false;
  /** Tracks peers we've sent an offer to (pending answer) */
  private pendingOffers = new Set<string>();
  /** Our own player ID — set via setLocalPlayerId() */
  private localPlayerId = "";

  /** Noise gate gain node — used to silence mic when not speaking */
  private noiseGate: GainNode | null = null;
  private noiseGateRafId: number | null = null;

  // ── Lifecycle ──

  async requestMicrophone(): Promise<boolean> {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: 1,
        } as MediaTrackConstraints,
      });
      this.audioContext = new AudioContext();

      const source = this.audioContext.createMediaStreamSource(
        this.localStream,
      );

      // High-pass at 200Hz — aggressively cuts fan noise, AC hum, rumble
      const highpass = this.audioContext.createBiquadFilter();
      highpass.type = "highpass";
      highpass.frequency.value = 200;
      highpass.Q.value = 0.7;

      // Low-pass at 8kHz — cuts high-frequency hiss
      const lowpass = this.audioContext.createBiquadFilter();
      lowpass.type = "lowpass";
      lowpass.frequency.value = 8000;
      lowpass.Q.value = 0.7;

      // Analyser to detect speech vs silence
      const gateAnalyser = this.audioContext.createAnalyser();
      gateAnalyser.fftSize = 512;
      gateAnalyser.smoothingTimeConstant = 0.3;

      // Noise gate — gain drops to 0 when below threshold
      this.noiseGate = this.audioContext.createGain();
      this.noiseGate.gain.value = 0; // Start closed

      const dest = this.audioContext.createMediaStreamDestination();

      // Chain: source → highpass → lowpass → analyser → noiseGate → dest
      source.connect(highpass);
      highpass.connect(lowpass);
      lowpass.connect(gateAnalyser);
      gateAnalyser.connect(this.noiseGate);
      this.noiseGate.connect(dest);

      this.processedStream = dest.stream;

      // Run noise gate logic — open when voice detected, close on silence
      const gateData = new Uint8Array(gateAnalyser.frequencyBinCount);
      const OPEN_THRESHOLD = 25; // amplitude to open gate
      const CLOSE_THRESHOLD = 15; // amplitude to close gate (hysteresis)
      let gateOpen = false;
      let silenceFrames = 0;
      const CLOSE_DELAY = 8; // ~130ms at 60fps — prevents choppy cutoffs

      const runGate = () => {
        gateAnalyser.getByteFrequencyData(gateData);
        // Focus on voice frequency bins (200Hz–4kHz range)
        const voiceBins = gateData.slice(2, 40);
        const avg = voiceBins.reduce((a, b) => a + b, 0) / voiceBins.length;

        if (!gateOpen && avg > OPEN_THRESHOLD) {
          gateOpen = true;
          silenceFrames = 0;
          this.noiseGate!.gain.linearRampToValueAtTime(
            1.0,
            this.audioContext!.currentTime + 0.02,
          );
        } else if (gateOpen && avg < CLOSE_THRESHOLD) {
          silenceFrames++;
          if (silenceFrames > CLOSE_DELAY) {
            gateOpen = false;
            this.noiseGate!.gain.linearRampToValueAtTime(
              0,
              this.audioContext!.currentTime + 0.05,
            );
          }
        } else if (gateOpen) {
          silenceFrames = 0;
        }

        this.noiseGateRafId = requestAnimationFrame(runGate);
      };
      this.noiseGateRafId = requestAnimationFrame(runGate);

      this.startSpeakingDetection();
      return true;
    } catch {
      console.warn("[VoiceManager] Microphone access denied");
      return false;
    }
  }

  releaseMicrophone(): void {
    this.disconnectAll();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.processedStream = null;
    this.noiseGate = null;
    if (this.noiseGateRafId != null) cancelAnimationFrame(this.noiseGateRafId);
    if (this.speakingRafId != null) cancelAnimationFrame(this.speakingRafId);
    this.audioContext?.close();
    this.audioContext = null;
  }

  get isActive(): boolean {
    return this.localStream !== null;
  }

  // ── Connection management ──

  setLocalPlayerId(id: string): void {
    this.localPlayerId = id;
  }

  /**
   * Returns true if we are the "polite" peer relative to the given peer.
   * The polite peer yields when both sides send offers simultaneously.
   * We use lexicographic comparison of player IDs as a stable tiebreaker.
   */
  isPolite(peerId: string): boolean {
    return this.localPlayerId < peerId;
  }

  /** Check if we have a pending outgoing offer to this peer */
  hasPendingOffer(peerId: string): boolean {
    return this.pendingOffers.has(peerId);
  }

  async createOffer(
    targetPlayerId: string,
  ): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection(targetPlayerId);
    this.addLocalTracks(pc);
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    this.pendingOffers.add(targetPlayerId);
    return offer;
  }

  async handleOffer(
    fromPlayerId: string,
    offer: RTCSessionDescriptionInit,
  ): Promise<RTCSessionDescriptionInit> {
    const pc = this.createPeerConnection(fromPlayerId);
    this.addLocalTracks(pc);
    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return answer;
  }

  async handleAnswer(
    fromPlayerId: string,
    answer: RTCSessionDescriptionInit,
  ): Promise<void> {
    const peer = this.peers.get(fromPlayerId);
    if (!peer) return;
    // Only accept answer if we're actually waiting for one
    if (peer.connection.signalingState !== "have-local-offer") return;
    await peer.connection.setRemoteDescription(
      new RTCSessionDescription(answer),
    );
    this.pendingOffers.delete(fromPlayerId);
  }

  async addIceCandidate(
    fromPlayerId: string,
    candidate: RTCIceCandidateInit,
  ): Promise<void> {
    const peer = this.peers.get(fromPlayerId);
    if (!peer) return;
    try {
      await peer.connection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch {
      // ICE candidate may arrive before remote description — safe to ignore
    }
  }

  // ── Controls ──

  setMuted(muted: boolean): void {
    this.muted = muted;
    // Mute both raw mic and processed stream
    this.localStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
    this.processedStream?.getAudioTracks().forEach((t) => {
      t.enabled = !muted;
    });
  }

  get isMuted(): boolean {
    return this.muted;
  }

  setVolume(playerId: string, volume: number): void {
    const peer = this.peers.get(playerId);
    if (peer) peer.gain.gain.value = Math.max(0, Math.min(1, volume));
  }

  disconnectPeer(playerId: string): void {
    const peer = this.peers.get(playerId);
    if (!peer) return;
    peer.connection.close();
    peer.audioEl?.remove();
    this.peers.delete(playerId);
    this.speakingState.delete(playerId);
    this.pendingOffers.delete(playerId);
    this.emit("peer-disconnected", { peerId: playerId });
  }

  disconnectAll(): void {
    for (const id of Array.from(this.peers.keys())) {
      this.disconnectPeer(id);
    }
  }

  get connectedPeerIds(): string[] {
    return Array.from(this.peers.keys());
  }

  getConnectionStatus(playerId: string): VoiceConnectionStatus {
    const peer = this.peers.get(playerId);
    if (!peer) return "disconnected";
    const state = peer.connection.connectionState;
    if (state === "connected") return "connected";
    if (state === "failed" || state === "closed") return "failed";
    return "connecting";
  }

  // ── Audio effects ──

  getAnalyserForPeer(playerId: string): AnalyserNode | null {
    return this.peers.get(playerId)?.analyser ?? null;
  }

  isSpeaking(playerId: string): boolean {
    return this.speakingState.get(playerId) ?? false;
  }

  applyParanoiaEffect(level: number): void {
    this.paranoiaLevel = level;
    if (!this.audioContext) return;

    for (const peer of this.peers.values()) {
      const { filter, gain } = peer;
      if (level < 30) {
        // Clean audio
        filter.frequency.value = 20000;
        filter.Q.value = 0;
        filter.type = "lowpass";
      } else if (level < 50) {
        // Subtle low-pass (muffled)
        filter.type = "lowpass";
        filter.frequency.value = 4000 - (level - 30) * 50;
        filter.Q.value = 1;
      } else if (level < 70) {
        // More aggressive filtering
        filter.type = "lowpass";
        filter.frequency.value = 2500 - (level - 50) * 30;
        filter.Q.value = 3;
      } else if (level < 85) {
        // Deep muffling + slight volume reduction
        filter.type = "lowpass";
        filter.frequency.value = 1500;
        filter.Q.value = 5;
        gain.gain.value = 0.8;
      } else {
        // Heavy distortion range
        filter.type = "lowpass";
        filter.frequency.value = 1000;
        filter.Q.value = 8;
        gain.gain.value = 0.6;
      }
    }
  }

  applyBlackoutEffect(active: boolean): void {
    this.blackoutActive = active;
    if (!this.audioContext) return;

    for (const peer of this.peers.values()) {
      const targetGain = active ? 0.2 : 1;
      peer.gain.gain.linearRampToValueAtTime(
        targetGain,
        this.audioContext.currentTime + (active ? 0.5 : 1.0),
      );
      if (active) {
        peer.filter.type = "bandpass";
        peer.filter.frequency.value = 800;
        peer.filter.Q.value = 10;
      } else {
        // Restore paranoia-based effect
        this.applyParanoiaEffect(this.paranoiaLevel);
      }
    }
  }

  /** Called by GhostHauntButton to auto-mute mic during haunt voice */
  setHauntActive(active: boolean): void {
    this._hauntActive = active;
    this.emit("haunt-state-change", {});
  }

  get isHauntActive(): boolean {
    return this._hauntActive;
  }

  // ── Events ──

  on(event: VoiceEventType, cb: VoiceEventCallback): void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb);
  }

  off(event: VoiceEventType, cb: VoiceEventCallback): void {
    this.listeners.get(event)?.delete(cb);
  }

  private emit(
    event: VoiceEventType,
    data: Parameters<VoiceEventCallback>[0],
  ): void {
    this.listeners.get(event)?.forEach((cb) => cb(data));
  }

  // ── Internals ──

  private createPeerConnection(peerId: string): RTCPeerConnection {
    // Clean up existing connection if any
    if (this.peers.has(peerId)) {
      this.disconnectPeer(peerId);
    }

    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    const ctx = this.audioContext!;
    const gain = ctx.createGain();
    const filter = ctx.createBiquadFilter();
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 256;

    filter.type = "lowpass";
    filter.frequency.value = 20000;

    // Chain: source → filter → gain → analyser → destination
    filter.connect(gain);
    gain.connect(analyser);
    analyser.connect(ctx.destination);

    const peerState: PeerState = {
      connection: pc,
      source: null,
      gain,
      filter,
      analyser,
      audioEl: null,
    };

    this.peers.set(peerId, peerState);

    // Handle incoming audio track
    pc.ontrack = (ev) => {
      const stream = ev.streams[0];
      if (!stream) return;

      // Safari requires an <audio> element to play WebRTC audio
      const audio = document.createElement("audio");
      audio.srcObject = stream;
      audio.autoplay = true;
      audio.volume = 0; // We route through Web Audio API instead
      audio.play().catch(() => {});
      peerState.audioEl = audio;

      // Route through Web Audio for effects
      const source = ctx.createMediaStreamSource(stream);
      source.connect(filter);
      peerState.source = source;

      // Re-apply current effects
      this.applyParanoiaEffect(this.paranoiaLevel);
      if (this.blackoutActive) this.applyBlackoutEffect(true);

      this.emit("peer-connected", { peerId });
    };

    pc.oniceconnectionstatechange = () => {
      const state = pc.iceConnectionState;
      if (
        state === "disconnected" ||
        state === "failed" ||
        state === "closed"
      ) {
        this.emit("peer-disconnected", { peerId });
      }
    };

    return pc;
  }

  private addLocalTracks(pc: RTCPeerConnection): void {
    // Send the processed stream (noise-filtered + boosted) instead of raw mic
    const stream = this.processedStream ?? this.localStream;
    if (!stream) return;
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }
  }

  /** Collect ICE candidates — returns a callback to get the onicecandidate handler */
  onIceCandidate(
    peerId: string,
    sendCandidate: (candidate: RTCIceCandidateInit) => void,
  ): void {
    const peer = this.peers.get(peerId);
    if (!peer) return;
    peer.connection.onicecandidate = (ev) => {
      if (ev.candidate) {
        sendCandidate(ev.candidate.toJSON());
      }
    };
  }

  private startSpeakingDetection(): void {
    const detect = () => {
      for (const [peerId, peer] of this.peers) {
        if (!peer.analyser) continue;
        const data = new Uint8Array(peer.analyser.frequencyBinCount);
        peer.analyser.getByteFrequencyData(data);
        const avg = data.reduce((a, b) => a + b, 0) / data.length;
        const speaking = avg > 15;
        const wasSpeaking = this.speakingState.get(peerId) ?? false;
        if (speaking !== wasSpeaking) {
          this.speakingState.set(peerId, speaking);
          this.emit("speaking-change", { peerId, speaking });
        }
      }
      this.speakingRafId = requestAnimationFrame(detect);
    };
    this.speakingRafId = requestAnimationFrame(detect);
  }
}

// Singleton
export const voiceManager = new VoiceManager();
