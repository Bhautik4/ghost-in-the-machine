"use client";

import { useRef, useEffect, useCallback, useState } from "react";
import {
  EditorView,
  keymap,
  lineNumbers,
  drawSelection,
} from "@codemirror/view";
import { EditorState } from "@codemirror/state";
import { javascript } from "@codemirror/lang-javascript";
import { defaultKeymap, history, historyKeymap } from "@codemirror/commands";
import { HighlightStyle, syntaxHighlighting } from "@codemirror/language";
import { tags } from "@lezer/highlight";
import { useEventListener } from "@liveblocks/react/suspense";

const ghostTheme = EditorView.theme({
  "&": {
    backgroundColor: "transparent",
    color: "#e4e4e7",
    fontSize: "14px",
    fontFamily: "'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    height: "100%",
  },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": {
    caretColor: "#a78bfa",
    padding: "16px 0",
    lineHeight: "24px",
  },
  ".cm-line": { padding: "0 20px" },
  ".cm-gutters": {
    backgroundColor: "#0c0c0f",
    color: "#52525b",
    border: "none",
    borderRight: "1px solid #3a3a42",
    minWidth: "48px",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#a1a1aa" },
  ".cm-activeLine": { backgroundColor: "rgba(109, 40, 217, 0.05)" },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#a78bfa",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(109, 40, 217, 0.4) !important",
  },
});

const ghostHighlight = HighlightStyle.define([
  { tag: tags.keyword, color: "#c084fc" },
  { tag: tags.controlKeyword, color: "#c084fc" },
  { tag: tags.definitionKeyword, color: "#c084fc" },
  { tag: tags.moduleKeyword, color: "#c084fc" },
  { tag: tags.operatorKeyword, color: "#c084fc" },
  { tag: tags.string, color: "#86efac" },
  { tag: tags.number, color: "#fde047" },
  { tag: tags.bool, color: "#fde047" },
  { tag: tags.null, color: "#fde047" },
  { tag: tags.typeName, color: "#22d3ee" },
  { tag: tags.className, color: "#22d3ee" },
  { tag: tags.comment, color: "#71717a", fontStyle: "italic" },
  { tag: tags.variableName, color: "#e4e4e7" },
  { tag: tags.function(tags.variableName), color: "#e4e4e7" },
  { tag: tags.propertyName, color: "#e4e4e7" },
  { tag: tags.operator, color: "#52525b" },
  { tag: tags.punctuation, color: "#52525b" },
  { tag: tags.bracket, color: "#52525b" },
  { tag: tags.tagName, color: "#22d3ee" },
  { tag: tags.attributeName, color: "#c084fc" },
  { tag: tags.attributeValue, color: "#86efac" },
]);

interface RemoteCursor {
  id: string;
  name: string;
  color: string;
  line: number;
  col: number;
}

interface PhantomCursor {
  id: string;
  line: number;
  col: number;
  color: string;
  name: string;
}

interface CMEditorProps {
  content: string;
  readOnly: boolean;
  onChange: (value: string) => void;
  onCursorMove: (line: number, col: number) => void;
  remoteCursors: RemoteCursor[];
}

export function CMEditor({
  content,
  readOnly,
  onChange,
  onCursorMove,
  remoteCursors,
}: CMEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const isLocalUpdate = useRef(false);
  const onChangeRef = useRef(onChange);
  const onCursorMoveRef = useRef(onCursorMove);
  const [phantoms, setPhantoms] = useState<PhantomCursor[]>([]);
  const [cursorPositions, setCursorPositions] = useState<
    { id: string; name: string; color: string; top: number; left: number }[]
  >([]);

  useEffect(() => {
    onChangeRef.current = onChange;
    onCursorMoveRef.current = onCursorMove;
  }, [onChange, onCursorMove]);

  // Listen for phantom cursor broadcasts
  useEventListener(
    useCallback(({ event }: { event: Record<string, unknown> }) => {
      if (event.type === "phantom-cursor") {
        const id = `phantom-${Date.now()}`;
        const phantom: PhantomCursor = {
          id,
          line: event.line as number,
          col: event.col as number,
          color: event.color as string,
          name: event.name as string,
        };
        setPhantoms((prev) => [...prev, phantom]);

        const duration = (event.duration as number) || 6000;
        const moveInterval = setInterval(() => {
          setPhantoms((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    line: Math.max(1, p.line + (Math.random() > 0.5 ? 1 : -1)),
                    col: Math.max(0, p.col + Math.floor(Math.random() * 5 - 2)),
                  }
                : p,
            ),
          );
        }, 800);

        setTimeout(() => {
          clearInterval(moveInterval);
          setPhantoms((prev) => prev.filter((p) => p.id !== id));
        }, duration);
      }
    }, []),
  );

  // Create editor on mount
  useEffect(() => {
    if (!containerRef.current) return;

    const updateListener = EditorView.updateListener.of((update) => {
      if (update.docChanged && !isLocalUpdate.current) {
        onChangeRef.current(update.state.doc.toString());
      }
      if (update.selectionSet || update.docChanged) {
        const pos = update.state.selection.main.head;
        const line = update.state.doc.lineAt(pos);
        onCursorMoveRef.current(line.number, pos - line.from);
      }
    });

    const state = EditorState.create({
      doc: content,
      extensions: [
        lineNumbers(),
        history(),
        drawSelection(),
        javascript({ jsx: true, typescript: true }),
        syntaxHighlighting(ghostHighlight),
        ghostTheme,
        keymap.of([...defaultKeymap, ...historyKeymap]),
        updateListener,
        EditorState.readOnly.of(readOnly),
      ],
    });

    const view = new EditorView({ state, parent: containerRef.current });
    viewRef.current = view;

    return () => {
      view.destroy();
      viewRef.current = null;
    };
  }, []);

  // Sync external content changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    const currentDoc = view.state.doc.toString();
    if (currentDoc !== content) {
      isLocalUpdate.current = true;
      view.dispatch({
        changes: { from: 0, to: currentDoc.length, insert: content },
      });
      isLocalUpdate.current = false;
    }
  }, [content]);

  // Compute pixel positions for all cursors (remote + phantom)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    const allCursors = [
      ...remoteCursors.map((c) => ({
        id: c.id,
        name: c.name,
        color: c.color,
        line: c.line,
        col: c.col,
      })),
      ...phantoms.map((p) => ({
        id: p.id,
        name: p.name,
        color: p.color,
        line: p.line,
        col: p.col,
      })),
    ];

    const positions = allCursors
      .map((cursor) => {
        try {
          const lineNum = Math.max(
            1,
            Math.min(cursor.line, view.state.doc.lines),
          );
          const lineInfo = view.state.doc.line(lineNum);
          const col = Math.min(cursor.col, lineInfo.length);
          const pos = lineInfo.from + col;
          const coords = view.coordsAtPos(pos);
          if (!coords) return null;

          const scrollerEl = view.scrollDOM;
          const scrollerRect = scrollerEl.getBoundingClientRect();

          return {
            id: cursor.id,
            name: cursor.name,
            color: cursor.color,
            top: coords.top - scrollerRect.top + scrollerEl.scrollTop,
            left: coords.left - scrollerRect.left + scrollerEl.scrollLeft,
          };
        } catch {
          return null;
        }
      })
      .filter(Boolean) as {
      id: string;
      name: string;
      color: string;
      top: number;
      left: number;
    }[];

    setCursorPositions(positions);
  }, [remoteCursors, phantoms]);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 min-h-full overflow-hidden"
    >
      {/* Cursor overlays rendered as React elements */}
      {cursorPositions.map((c) => (
        <div
          key={c.id}
          className="absolute pointer-events-none z-30 transition-all duration-150"
          style={{ top: c.top, left: c.left }}
        >
          <div
            className="w-[2px] h-5 rounded-full"
            style={{ backgroundColor: c.color }}
          />
          <div
            className="absolute -top-5 left-0 px-1.5 py-0.5 rounded-sm text-[9px] font-bold uppercase tracking-wider whitespace-nowrap"
            style={{ backgroundColor: c.color, color: "#fff" }}
          >
            {c.name}
          </div>
        </div>
      ))}
    </div>
  );
}
