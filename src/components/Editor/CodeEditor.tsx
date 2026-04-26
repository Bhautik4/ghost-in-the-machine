"use client";

import { useGameStore } from "@/store/gameStore";
import { useRef, useEffect, useCallback } from "react";

export function CodeEditor() {
  const { activeTab, tasks, updateTaskCode, phase, ghostEvents } =
    useGameStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fileTasks = tasks.filter((t) => t.fileName === activeTab);

  // Build the full file content from tasks
  const fileContent = fileTasks.map((t) => t.currentCode).join("\n\n");

  const hasGlitch = ghostEvents.some((e) => e.type === "glitch");
  const hasFlicker = ghostEvents.some((e) => e.type === "flicker");

  const lines = fileContent.split("\n");

  const handleCodeChange = useCallback(
    (newContent: string) => {
      if (phase !== "playing") return;

      // Map the full content back to individual tasks
      const sections = newContent.split("\n\n");
      fileTasks.forEach((task, i) => {
        if (sections[i] !== undefined && sections[i] !== task.currentCode) {
          updateTaskCode(task.id, sections[i]);
        }
      });
    },
    [phase, fileTasks, updateTaskCode],
  );

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.value = fileContent;
    }
  }, [fileContent]);

  // Syntax highlighting (simplified)
  const highlightLine = (line: string) => {
    const tokens: { text: string; className: string }[] = [];

    // Keywords
    const keywordPattern =
      /\b(import|export|from|const|let|var|function|return|if|else|new|typeof|class|extends|interface|type|async|await)\b/g;
    const stringPattern = /(["'`])(?:(?!\1).)*\1/g;
    const commentPattern = /\/\/.*/g;
    const numberPattern = /\b\d+\b/g;
    const typePattern = /\b[A-Z][a-zA-Z]*\b/g;

    let remaining = line;
    let result = "";

    // Simple token-based highlighting
    const parts = remaining.split(
      /(\b(?:import|export|from|const|let|var|function|return|if|else|new|typeof|class|extends|interface|type|async|await)\b|(?:["'`])(?:(?!["'`]).)*(?:["'`])|\/\/.*|\b\d+\b|[<>/{}()[\];,=+\-*.])/,
    );

    return parts.map((part, i) => {
      if (
        /^(import|export|from|const|let|var|function|return|if|else|new|typeof|class|extends|interface|type|async|await)$/.test(
          part,
        )
      ) {
        return (
          <span key={i} className="text-[#c084fc] drop-shadow-[0_0_3px_rgba(192,132,252,0.4)]">
            {part}
          </span>
        );
      }
      if (/^["'`]/.test(part)) {
        return (
          <span key={i} className="text-[#86efac] drop-shadow-[0_0_3px_rgba(134,239,172,0.4)]">
            {part}
          </span>
        );
      }
      if (/^\/\//.test(part)) {
        return (
          <span key={i} className="text-[#71717a] italic">
            {part}
          </span>
        );
      }
      if (/^\d+$/.test(part)) {
        return (
          <span key={i} className="text-[#fde047] drop-shadow-[0_0_3px_rgba(253,224,71,0.4)]">
            {part}
          </span>
        );
      }
      if (/^[<>/{}()[\];,=+\-*.]$/.test(part)) {
        return (
          <span key={i} className="text-[#52525b]">
            {part}
          </span>
        );
      }
      if (/^[A-Z]/.test(part)) {
        return (
          <span key={i} className="text-[#22d3ee] drop-shadow-[0_0_3px_rgba(34,211,238,0.4)]">
            {part}
          </span>
        );
      }
      return (
        <span key={i} className="text-[#e4e4e7]">
          {part}
        </span>
      );
    });
  };

  // Find error lines
  const errorLines = new Set<number>();
  let lineOffset = 0;
  fileTasks.forEach((task) => {
    if (!task.isFixed) {
      errorLines.add(lineOffset + task.line);
    }
    lineOffset += task.currentCode.split("\n").length + 1; // +1 for the blank line separator
  });

  return (
    <div
      className={`flex-1 overflow-auto bg-[#09090b] relative font-mono ${hasGlitch ? "glitch-active" : ""} ${hasFlicker ? "flicker-active" : ""}`}
    >
      {/* Scanline overlay when paranoid */}
      {ghostEvents.some((e) => e.type === "scanline") && (
        <div className="scanline-overlay" />
      )}

      <div className="flex min-h-full">
        {/* Line numbers */}
        <div className="sticky left-0 bg-[#09090b] z-10 select-none pr-4 pl-4 pt-3 text-right border-r border-[#27272a]/50">
          {lines.map((_, i) => (
            <div
              key={i}
              className={`text-xs leading-6 ${
                errorLines.has(i + 1) ? "text-red-500 drop-shadow-[0_0_5px_rgba(239,68,68,0.8)] font-bold" : "text-[#52525b]"
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>

        {/* Code area */}
        <div className="flex-1 relative">
          {/* Highlighted code display */}
          <div className="absolute inset-0 pt-3 pl-4 pointer-events-none">
            {lines.map((line, i) => (
              <div
                key={i}
                className={`text-[13px] leading-6 whitespace-pre tracking-wide ${
                  errorLines.has(i + 1)
                    ? "bg-red-500/5 border-l-[3px] border-red-500/50 -ml-4 pl-[13px]"
                    : "border-l-[3px] border-transparent -ml-4 pl-[13px]"
                }`}
              >
                {highlightLine(line)}
              </div>
            ))}
          </div>

          {/* Editable textarea overlay */}
          <textarea
            ref={textareaRef}
            defaultValue={fileContent}
            onChange={(e) => handleCodeChange(e.target.value)}
            disabled={phase !== "playing"}
            spellCheck={false}
            className="absolute inset-0 w-full h-full pt-3 pl-4 bg-transparent text-transparent caret-[#a78bfa] text-[13px] leading-6 tracking-wide resize-none outline-none font-mono selection:bg-[#6d28d9]/40"
            style={{ caretColor: "#a78bfa" }}
          />
        </div>
      </div>

      {/* Minimap (decorative) */}
      <div className="absolute right-0 top-0 bottom-0 w-16 bg-[#09090b]/80 backdrop-blur-sm border-l border-[#27272a]/50 hidden lg:block z-10">
        <div className="p-1 pt-3">
          {lines.map((line, i) => (
            <div
              key={i}
              className="h-[3px] mb-px rounded-sm"
              style={{
                width: `${Math.min(100, (line.length / 60) * 100)}%`,
                backgroundColor: errorLines.has(i + 1)
                  ? "rgba(239,68,68,0.6)"
                  : "rgba(113,113,122,0.2)",
                boxShadow: errorLines.has(i + 1) ? "0 0 4px rgba(239,68,68,0.4)" : "none",
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
