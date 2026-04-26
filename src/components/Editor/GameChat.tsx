"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  useBroadcastEvent,
  useEventListener,
  useSelf,
} from "@liveblocks/react/suspense";
import { MessageSquare, Send, ChevronDown, ChevronUp } from "lucide-react";

interface ChatMsg {
  id: string;
  playerId: string;
  playerName: string;
  text: string;
  color: string;
  timestamp: number;
}

/**
 * In-game text chat.
 * Ghost can use this to blend in ("I think the bug is on line 3").
 * Messages are broadcast via Liveblocks RoomEvent — not persisted.
 */
export function GameChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [isOpen, setIsOpen] = useState(true);
  const [unread, setUnread] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const self = useSelf();
  const broadcast = useBroadcastEvent();

  // Auto-scroll on new messages
  useEffect(() => {
    if (scrollRef.current && isOpen) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  // Listen for chat messages
  useEventListener(
    useCallback(
      ({ event }: { event: Record<string, unknown> }) => {
        if (event.type === "chat") {
          const msg: ChatMsg = {
            id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
            playerId: event.playerId as string,
            playerName: event.playerName as string,
            text: event.text as string,
            color: event.color as string,
            timestamp: Date.now(),
          };
          setMessages((prev) => [...prev.slice(-50), msg]); // Keep last 50
          if (!isOpen) setUnread((u) => u + 1);
        }
      },
      [isOpen],
    ),
  );

  const sendMessage = () => {
    const text = input.trim();
    if (!text || !self) return;

    broadcast({
      type: "chat",
      playerId: self.presence.playerId,
      playerName: self.presence.name,
      text,
      color: self.presence.color,
    });

    // Also add locally (broadcast doesn't echo back to sender)
    setMessages((prev) => [
      ...prev.slice(-50),
      {
        id: `msg-${Date.now()}`,
        playerId: self.presence.playerId,
        playerName: self.presence.name,
        text,
        color: self.presence.color,
        timestamp: Date.now(),
      },
    ]);
    setInput("");
  };

  // Activity log entries (shown as system messages)
  useEventListener(
    useCallback(({ event }: { event: Record<string, unknown> }) => {
      if (event.type === "sfx" && event.sound === "task-fixed") {
        setMessages((prev) => [
          ...prev.slice(-50),
          {
            id: `sys-${Date.now()}`,
            playerId: "system",
            playerName: "System",
            text: "A bug was just fixed!",
            color: "#22c55e",
            timestamp: Date.now(),
          },
        ]);
      }
    }, []),
  );

  if (!isOpen) {
    return (
      <button
        onClick={() => {
          setIsOpen(true);
          setUnread(0);
        }}
        className="absolute bottom-48 right-4 z-40 flex items-center gap-2 px-3 py-2 bg-[#09090b]/90 backdrop-blur-md border border-[#27272a]/50 rounded-sm text-[10px] text-[#71717a] hover:text-[#a78bfa] hover:border-[#6d28d9]/50 transition-all shadow-lg font-mono uppercase tracking-widest"
      >
        <MessageSquare size={12} />
        Team Chat
        {unread > 0 && (
          <span className="ml-1 px-1.5 py-0.5 bg-[#6d28d9] text-white rounded-sm text-[9px] shadow-[0_0_5px_rgba(109,40,217,0.5)]">
            {unread}
          </span>
        )}
        <ChevronUp size={10} />
      </button>
    );
  }

  return (
    <div className="absolute bottom-48 right-4 z-40 w-72 font-mono">
      <div className="bg-[#09090b]/95 backdrop-blur-md border border-[#27272a]/50 rounded-sm shadow-xl shadow-black/50 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-[#27272a]/50 bg-[#18181b]/50">
          <div className="flex items-center gap-2">
            <MessageSquare size={12} className="text-[#a78bfa]" />
            <span className="text-[10px] text-[#e4e4e7] uppercase tracking-[0.2em] font-bold">
              Team Chat
            </span>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="text-[#71717a] hover:text-[#a1a1aa] transition-colors p-1"
          >
            <ChevronDown size={12} />
          </button>
        </div>

        {/* Messages */}
        <div
          ref={scrollRef}
          className="h-48 overflow-y-auto px-3 py-2 space-y-2"
        >
          {messages.length === 0 && (
            <p className="text-[10px] text-[#52525b] text-center py-4 uppercase tracking-widest">
              Silence on the channel...
            </p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="text-[11px] leading-relaxed break-words">
              {msg.playerId === "system" ? (
                <span className="text-[#22c55e] italic drop-shadow-[0_0_3px_rgba(34,197,94,0.3)]">{msg.text}</span>
              ) : (
                <>
                  <span className="font-bold uppercase tracking-wider drop-shadow-[0_0_2px_currentColor]" style={{ color: msg.color }}>
                    {msg.playerName}
                  </span>
                  <span className="text-[#52525b]"> &gt; </span>
                  <span className="text-[#d4d4d8]">{msg.text}</span>
                </>
              )}
            </div>
          ))}
        </div>

        {/* Input */}
        <div className="flex items-center gap-2 px-3 py-2 border-t border-[#27272a]/50 bg-[#18181b]/30">
          <span className="text-[#a78bfa] text-xs font-bold">&gt;</span>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
            placeholder="Broadcast message..."
            className="flex-1 bg-transparent text-[11px] text-[#e4e4e7] outline-none placeholder:text-[#52525b] placeholder:uppercase placeholder:tracking-wider tracking-wide"
            maxLength={200}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim()}
            className="p-1.5 text-[#52525b] hover:text-[#a78bfa] disabled:opacity-30 disabled:hover:text-[#52525b] transition-colors rounded-sm"
          >
            <Send size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}
