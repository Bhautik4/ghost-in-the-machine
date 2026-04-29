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
    color: "#d4d4d4",
    fontSize: "15px",
    fontFamily:
      "var(--font-mono), 'JetBrains Mono', 'Fira Code', ui-monospace, monospace",
    height: "100%",
  },
  ".cm-scroller": { overflow: "auto" },
  ".cm-content": {
    caretColor: "#569cd6",
    padding: "16px 0",
    lineHeight: "30px",
  },
  ".cm-line": { padding: "0 20px" },
  ".cm-gutters": {
    backgroundColor: "#181818",
    color: "#858585",
    border: "none",
    borderRight: "1px solid #3c3c3c",
    minWidth: "48px",
  },
  ".cm-activeLineGutter": { backgroundColor: "transparent", color: "#c6c6c6" },
  ".cm-activeLine": { backgroundColor: "rgba(255, 255, 255, 0.04)" },
  "&.cm-focused .cm-cursor": {
    borderLeftColor: "#d4d4d4",
    borderLeftWidth: "2px",
  },
  "&.cm-focused .cm-selectionBackground, .cm-selectionBackground": {
    backgroundColor: "rgba(38, 79, 120, 0.6) !important",
  },
});

const ghostHighlight = HighlightStyle.define([
  // Keywords — VS Code Dark+ purple/blue
  { tag: tags.keyword, color: "#c586c0" },
  { tag: tags.controlKeyword, color: "#c586c0" },
  { tag: tags.definitionKeyword, color: "#569cd6" },
  { tag: tags.moduleKeyword, color: "#c586c0" },
  { tag: tags.operatorKeyword, color: "#569cd6" },
  // Strings — VS Code Dark+ orange
  { tag: tags.string, color: "#ce9178" },
  // Numbers/booleans/null — VS Code Dark+ light green
  { tag: tags.number, color: "#b5cea8" },
  { tag: tags.bool, color: "#569cd6" },
  { tag: tags.null, color: "#569cd6" },
  // Types/classes — VS Code Dark+ teal
  { tag: tags.typeName, color: "#4ec9b0" },
  { tag: tags.className, color: "#4ec9b0" },
  // Comments — VS Code Dark+ green
  { tag: tags.comment, color: "#6a9955", fontStyle: "italic" },
  // Variables/properties — VS Code Dark+ light blue
  { tag: tags.variableName, color: "#9cdcfe" },
  { tag: tags.function(tags.variableName), color: "#dcdcaa" },
  { tag: tags.propertyName, color: "#9cdcfe" },
  // Operators/punctuation
  { tag: tags.operator, color: "#d4d4d4" },
  { tag: tags.punctuation, color: "#d4d4d4" },
  { tag: tags.bracket, color: "#d4d4d4" },
  // JSX/HTML
  { tag: tags.tagName, color: "#569cd6" },
  { tag: tags.attributeName, color: "#9cdcfe" },
  { tag: tags.attributeValue, color: "#ce9178" },
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

    // Disable Grammarly / spellcheck / autocorrect on the contenteditable element
    const cmContent = containerRef.current.querySelector(".cm-content");
    if (cmContent) {
      cmContent.setAttribute("data-gramm", "false");
      cmContent.setAttribute("data-gramm_editor", "false");
      cmContent.setAttribute("data-enable-grammarly", "false");
      cmContent.setAttribute("spellcheck", "false");
      cmContent.setAttribute("autocorrect", "off");
      cmContent.setAttribute("autocapitalize", "off");
      cmContent.setAttribute("data-ms-editor", "false");
    }

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
      className="relative h-full overflow-hidden"
      data-gramm="false"
      data-gramm_editor="false"
      data-enable-grammarly="false"
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      data-ms-editor="false"
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
            className="absolute -top-5 left-0 px-1.5 py-0.5 rounded text-xs font-semibold whitespace-nowrap"
            style={{ backgroundColor: c.color, color: "#111111" }}
          >
            {c.name}
          </div>
        </div>
      ))}
    </div>
  );
}
