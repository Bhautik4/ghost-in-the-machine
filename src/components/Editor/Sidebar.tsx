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
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-xs hover:bg-surface-raised transition-colors group ${
              isActive
                ? "bg-surface-raised text-accent-soft border-l-2 border-accent"
                : "text-text-muted border-l-2 border-transparent"
            }`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            {node.type === "folder" ? (
              <>
                {isExpanded ? (
                  <ChevronDown
                    size={14}
                    className="shrink-0 text-text-subtle"
                  />
                ) : (
                  <ChevronRight
                    size={14}
                    className="shrink-0 text-text-subtle"
                  />
                )}
                {isExpanded ? (
                  <FolderOpen size={14} className="shrink-0 text-accent" />
                ) : (
                  <Folder size={14} className="shrink-0 text-accent" />
                )}
              </>
            ) : (
              <>
                <span className="w-3.5 shrink-0" />
                <FileText
                  size={14}
                  className={`shrink-0 ${
                    node.name.endsWith(".tsx")
                      ? "text-info-blue"
                      : node.name.endsWith(".ts")
                        ? "text-info"
                        : "text-text-subtle"
                  }`}
                />
              </>
            )}
            <span className="truncate tracking-wider">{node.name}</span>
            {node.hasError && !node.isFixed && (
              <Circle
                size={8}
                className="shrink-0 ml-auto fill-red-500 text-red-500"
              />
            )}
            {node.isFixed && (
              <CheckCircle2
                size={12}
                className="shrink-0 ml-auto text-green-500"
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
      <div className="w-12 bg-surface-deep border-r border-border/50 flex flex-col items-center py-3 gap-2">
        {sideIcons.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveSection(id)}
            title={label}
            className={`w-10 h-10 flex items-center justify-center rounded-sm transition-all duration-200 ${
              activeSection === id
                ? "text-accent-soft bg-accent/10 border border-accent/30 shadow-accent"
                : "text-text-subtle hover:text-text-muted hover:bg-surface"
            }`}
          >
            <Icon size={20} />
          </button>
        ))}
      </div>

      {/* Panel */}
      <div className="w-56 bg-surface border-r border-border/50 flex flex-col overflow-hidden">
        <div className="px-4 py-3 text-[10px] font-bold uppercase tracking-[0.2em] text-text-muted border-b border-border/50 shadow-sm bg-surface-deep/50">
          {activeSection === "files" && "Explorer"}
          {activeSection === "players" && "Players"}
          {activeSection === "search" && "Search"}
          {activeSection === "git" && "Source Control"}
          {activeSection === "debug" && "Debug Console"}
        </div>

        <div className="flex-1 overflow-y-auto py-2">
          {activeSection === "files" && (
            <>
              <div className="px-4 py-2 mt-1 mb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-text-faint">
                ghost-machine
              </div>
              {renderTree(fileTree)}
            </>
          )}

          {activeSection === "players" && (
            <div className="px-3 py-2 space-y-2">
              {/* Self */}
              {self && self.presence.name && (
                <div className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs bg-surface-deep border border-border/50">
                  <div
                    className="w-2.5 h-2.5 rounded-sm cursor-glow"
                    style={{
                      backgroundColor: self.presence.color,
                      color: self.presence.color,
                    }}
                  />
                  <span className="text-text-primary uppercase tracking-wider">
                    {self.presence.name}
                    <span className="text-text-faint ml-1.5 tracking-widest">
                      (you)
                    </span>
                  </span>
                  {phase === "playing" &&
                    ghostId === self.presence.playerId && (
                      <Ghost size={14} className="ml-auto text-red-500" />
                    )}
                </div>
              )}
              {/* Others */}
              {others
                .filter((o) => o.presence.name !== "")
                .map((o) => (
                  <div
                    key={o.connectionId}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-sm text-xs border border-transparent hover:bg-surface-raised transition-colors"
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-sm cursor-glow"
                      style={{
                        backgroundColor: o.presence.color,
                        color: o.presence.color,
                      }}
                    />
                    <span className="text-text-secondary uppercase tracking-wider">
                      {o.presence.name}
                    </span>
                  </div>
                ))}
              {others.filter((o) => o.presence.name !== "").length === 0 &&
                !self?.presence.name && (
                  <p className="text-[10px] text-text-faint px-3 uppercase tracking-widest">
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
