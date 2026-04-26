PROJECT MASTER SPEC: "Ghost in the Machine"
Project Type: Real-time Multiplayer Social Deduction Game (Next.js)
Context: This is for a high-stakes hackathon combining the Zed IDE aesthetic with ElevenLabs AI Audio.

1. The Core Concept
   The game is an "Imposter" style experience for developers.

Engineers (3 players): Work in a shared, synchronized code editor to fix "Logic Bugs" and "Syntax Errors" to reboot a system.

The Ghost (1 player): A hidden player whose goal is to sabotage the codebase and mentally manipulate the Engineers.

The Winning Edge: The Ghost’s primary tool is a Real-time AI Voice powered by ElevenLabs Speech-to-Speech (STS), allowing them to haunt the other players with a distorted, inhuman voice.

2. Visual Identity (The "Zed" Clone)
   The UI must be a pixel-perfect replica of the Zed Editor.

Theme: Deep Dark (Zinc/Slate palettes).

Layout: \* Left Sidebar: File tree showing the "Project Files" (Tasks).

Center Area: A code editor with syntax highlighting and multi-player cursors.

Bottom: A functional terminal that shows "Compiler Errors" triggered by the Ghost.

Right Sidebar: "Paranoia Meter" and a list of active players.

3. Technical Architecture
   Framework: Next.js (App Router), TypeScript, Tailwind CSS.

Multiplayer: Liveblocks for real-time cursor tracking, text synchronization, and room presence.

Audio Engine: ElevenLabs API via Next.js API Routes.

State Management: Zustand to track game roles, health, and win/loss conditions.

4. Feature List
   A. The Synchronized Editor
   Real-time collaborative text editing.

Shared "Terminal" output that updates based on the code's "System Health."

B. The ElevenLabs Voice Pipeline
Ghost Voice: A MediaRecorder hook captures the Ghost's mic, sends the blob to /api/voice, which returns a processed ElevenLabs Speech-to-Speech buffer to be broadcasted to all Engineers.

Sound Effects: A "Sabotage Menu" that allows the Ghost to trigger ElevenLabs Sound Effects (e.g., Screams, Digital Glitches, Heavy Breathing) into other players' audio streams.

C. Sabotage Mechanics
UI Glitches: CSS animations that make the editor "melt" or "flicker" for Engineers.

Code Corruption: Ghost can remotely inject "Bugs" (hidden text characters) that break the Engineer's tasks.

5. Development Strategy
   Phase 1: Build the static Zed-like UI shell using Tailwind.

Phase 2: Integrate Liveblocks to enable the "Imposter" multiplayer logic (Who is where? Who is typing?).

Phase 3: Build the /api/voice route to connect to ElevenLabs.

Phase 4: Polish the "Win/Loss" screen and the viral video demo elements.
