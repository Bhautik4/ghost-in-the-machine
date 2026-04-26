"use client";

import {
  FileText,
  FolderOpen,
  Folder,
  ChevronRight,
  ChevronDown,
  Search,
  GitBranch,
  Bug,
  Users,
  Ghost,
  CheckCircle2,
  Circle,
} from "lucide-react";
import { useState } from "react";
import { useOthers, useSelf, useStorage } from "@liveblocks/react/suspense";
import { useGameStore } from "@/store/gameStore";

interface FileNode {
  name: string;
  type: "file" | "folder";
  children?: FileNode[];
  hasError?: boolean;
  isFixed?: boolean;
}

export function Sidebar() {
  const { tasks, activeTab, setActiveTab, phase } = useGameStore();
  const self = useSelf();
  const others = useOthers();
  const ghostId = useStorage((root) => root.ghostId);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(
    new Set(["src", "components"]),
  );
  const [activeSection, setActiveSection] = useState<
    "files" | "search" | "git" | "debug" | "players"
  >("files");

  const fileTree: FileNode[] = [
    {
      name: "src",
      type: "folder",
      children: [
        {
          name: "components",
          type: "folder",
          children: [
            {
              name: "Game.tsx",
              type: "file",
              hasError: tasks
                .filter((t) => t.fileName === "Game.tsx")
                .some((t) => !t.isFixed),
              isFixed: tasks
                .filter((t) => t.fileName === "Game.tsx")
                .every((t) => t.isFixed),
            },
          ],
        },
        {
          name: "Main.ts",
          type: "file",
          hasError: tasks
            .filter((t) => t.fileName === "Main.ts")
            .some((t) => !t.isFixed),
          isFixed: tasks
            .filter((t) => t.fileName === "Main.ts")
            .every((t) => t.isFixed),
        },
        { name: "types.d.ts", type: "file" },
        { name: "config.json", type: "file" },
      ],
    },
    { name: "package.json", type: "file" },
    { name: "tsconfig.json", type: "file" },
  ];

  const toggleFolder = (name: string) => {
    const next = new Set(expandedFolders);
    if (next.has(name)) next.delete(name);
    else next.add(name);
    setExpandedFolders(next);
  };

  const renderTree = (nodes: FileNode[], depth = 0) =>
    nodes.map((node) => {
      const isExpanded = expandedFolders.has(node.name);
      const isActive = node.type === "file" && activeTab === node.name;

      return (
        <div key={node.name} className="font-mono">
          <button
            onClick={() =>
              node.type === "folder"
                ? toggleFolder(node.name)
                : setActiveTab(node.name)
            }
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-[#1e1e22] transition-colors group ${
              isActive ? "bg-[#1e1e22] text-[#a78bfa] border-l-2 border-[#6d28d9]" : "text-[#a1a1aa] border-l-2 border-transparent"
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {node.type === "folder" ? (
              <>
                {isExpanded ? (
                  <ChevronDown size={14} className="shrink-0 text-[#71717a]" />
                ) : (
                  <ChevronRight size={14} className="shrink-0 text-[#71717a]" />
                )}
                {isExpanded ? (
                  <FolderOpen size={14} className="shrink-0 text-[#6d28d9] drop-shadow-[0_0_5px_rgba(109,40,217,0.5)]" />
                ) : (
                  <Folder size={14} className="shrink-0 text-[#6d28d9]" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5 shrink-0" />
                <FileText
                  size={14}
                  className={`shrink-0 ${
                    node.name.endsWith(".tsx")
                      ? "text-[#3b82f6] drop-shadow-[0_0_5px_rgba(59,130,246,0.3)]"
                      : node.name.endsWith(".ts")
                        ? "text-[#06b6d4] drop-shadow-[0_0_5px_rgba(6,182,212,0.3)]"
                        : "text-[#71717a]"
                  }`}
                />
              </>
            )}
            <span className="truncate tracking-wider">{node.name}</span>
            {node.hasError && !node.isFixed && (
              <Circle
                size={8}
                className="shrink-0 ml-auto fill-red-500 text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]"
              />
            )}
            {node.isFixed && (
              <CheckCircle2
                size={12}
                className="shrink-0 ml-auto text-green-500 drop-shadow-[0_0_5px_rgba(34,197,94,0.5)]"
              />
            )}
          </button>
          {node.type === "folder" && isExpanded && node.children && (
            <div>{renderTree(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });

  const sideIcons = [
    { id: "files" as const, icon: FileText, label: "Explorer" },
    { id: "search" as const, icon: Search, label: "Search" },
    { id: "git" as const, icon: GitBranch, label: "Source Control" },
    { id: "debug" as const, icon: Bug, label: "Debug" },
    { id: "players" as const, icon: Users, label: "Players" },
  ];

  return (
    <div className="flex h-full font-mono">
      {/* Icon rail */}
      <div className="w-12 bg-[#09090b] border-r border-[#27272a]/50 flex flex-col items-center py-3 gap-2">
        {sideIcons.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            title={label}
            className={`w-10 h-10 flex items-center justify-center rounded-sm transition-all duration-200 ${
              activeSection === id
                ? "text-[#a78bfa] bg-[#6d28d9]/10 border border-[#6d28d9]/30 shadow-[0_0_10px_rgba(109,40,217,0.2)]"
                : "text-[#71717a] hover:text-[#a1a1aa] hover:bg-[#18181b]"
            }`}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="w-56 bg-[#18181b] border-r border-[#27272a]/50 flex flex-col overflow-hidden">
        <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-[#a1a1aa] border-b border-[#27272a]/50 shadow-sm bg-[#09090b]/50">
          {activeSection === "files" && "Explorer"}
          {activeSection === "players" && "Players"}
          {activeSection === "search" && "Search"}
          {activeSection === "git" && "Source Control"}
          {activeSection === "debug" && "Debug Console"}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {activeSection === "files" && (
            <>
              <div className="px-4 py-2 mt-1 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#52525b]">
                ghost-machine
              </div>
              {renderTree(fileTree)}
            </>
          )}

          {activeSection === "players" && (
            <div className="px-3 py-2 space-y-2">
              {/* Self */}
              {self && self.presence.name && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs bg-[#09090b] border border-[#27272a]/50">
                  <div
                    className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px_currentColor]"
                    style={{ backgroundColor: self.presence.color, color: self.presence.color }}
                  />
                  <span className="text-[#e4e4e7] uppercase tracking-wider">
                    {self.presence.name}
                    <span className="text-[#52525b] ml-1.5 tracking-widest">(you)</span>
                  </span>
                  {phase === "playing" &&
                    ghostId === self.presence.playerId && (
                      <Ghost size={14} className="ml-auto text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]" />
                    )}
                </div>
              )}
              {/* Others */}
              {others
                .filter((o) => o.presence.name !== "")
                .map((o) => (
                  <div
                    key={o.connectionId}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs border border-transparent hover:bg-[#1e1e22] transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm shadow-[0_0_8px_currentColor]"
                      style={{ backgroundColor: o.presence.color, color: o.presence.color }}
                    />
                    <span className="text-[#d4d4d8] uppercase tracking-wider">{o.presence.name}</span>
                  </div>
                ))}
              {others.filter((o) => o.presence.name !== "").length === 0 &&
                !self?.presence.name && (
                  <p className="text-[10px] text-[#52525b] px-3 uppercase tracking-widest">
                    No players yet...
                  </p>
                )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
