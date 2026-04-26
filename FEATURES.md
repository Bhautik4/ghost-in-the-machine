# Ghost in the Machine — Feature List

## 1. Landing Page & Room System

### 1.1 Landing Page

- **Component:** `app/page.tsx`
- **What it does:** Two main actions: "Create Game" generates a unique 6-character alphanumeric room code (e.g., `XJ29L1`) and redirects to `/room/XJ29L1`. "Join Game" has an input field for a room code and a "Join" button that validates and redirects to `/room/[code]`.
- **UI Element:** Full-screen centered layout with Ghost logo, Create Game button, divider, and Join Game input.

### 1.2 Room Codes

- **Library:** `lib/roomCode.ts`
- **What it does:** Generates 6-character codes using `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I to avoid confusion). Converts codes to Liveblocks room IDs (`room-XXXXXX`). Defines `MAX_PLAYERS = 4` and `MAX_GAME_DURATION_MS = 10 minutes`.

### 1.3 Dynamic Routing

- **Route:** `app/room/[code]/page.tsx`
- **What it does:** Single page handles both lobby and game phases. Uses the room code as the Liveblocks Room ID. `RoomContent` component reads `gameStatus` from Storage and renders either `Lobby` or `EditorWorkspace` — no page navigation needed, the UI switches in-place.

### 1.4 Room Validation

- **Component:** `Lobby.tsx`
- **What it does:** When a user joins, checks Liveblocks presence count. If a room already has 4 players, shows a "Room Full" screen with a link back to home.

### 1.5 Room Cleanup

- **Route:** `api/cleanup-rooms/route.ts`
- **What it does:** Cron-compatible GET endpoint. Paginates through all Liveblocks rooms, checks active user count via the Liveblocks API, and deletes rooms with 0 players. Secured with a `CRON_SECRET` query parameter. Call hourly to stay within the 500-room limit.

### 1.6 10-Minute Force-Close

- **Component:** `EditorWorkspace.tsx`
- **What it does:** Starts a `setTimeout` when the game begins. If 10 minutes pass without a winner, force-sets `gameStatus: "ghost-wins"` in Liveblocks Storage.

---

## 2. Lobby System

### 2.1 Player Join

- **Component:** `Lobby.tsx`
- **What it does:** Players enter their name and click "Join" to enter the game room. Their profile is persisted in Supabase via upsert. Their presence (name, color, ready status) is broadcast to all other players via Liveblocks in real-time.
- **UI Element:** Full-screen view with room code badge, name input field, and "Join" button.

### 2.2 Ready Up

- **Component:** `Lobby.tsx`
- **What it does:** After joining, each player toggles a "Ready" button. A green checkmark appears next to their name. The game can only start when all players are ready (minimum 2).
- **UI Element:** "Ready Up" / "Ready!" toggle button below the player list.

### 2.3 Host System

- **Component:** `Lobby.tsx`
- **What it does:** The first player to click "Join" claims the "Host" role (stored by `playerId` in Liveblocks Storage). Only the host sees the "Start Game" button. A gold crown icon appears next to the host's name, and a "You are the Host" / "Waiting for host to start..." label is shown at the bottom.
- **UI Element:** Crown icon next to host name, host label text, "Start Game" button (host only).

### 2.4 Start Game & Role Assignment

- **Component:** `Lobby.tsx`
- **What it does:** When the host clicks "Start Game", `Math.random()` picks one player's ID from the Liveblocks presence list as the Ghost. The `ghostId` and `gameStatus: "active"` are written to Liveblocks Storage. The `RoomContent` component detects the status change and switches from Lobby UI to Editor Workspace UI for all players simultaneously.
- **UI Element:** "Start Game" button (enabled only when all players are ready).

### 2.5 Copy Invite Link

- **Component:** `Lobby.tsx`
- **What it does:** After joining, the host (and all players) see an "Invite Link" button next to the room code. Clicking it copies the full URL (`yoursite.com/room/XJ29L1`) to the clipboard. Shows a "Copied!" confirmation for 2 seconds.
- **UI Element:** Small button with Copy icon next to the room code badge.

### 2.6 Stale State Reset

- **Component:** `Lobby.tsx`
- **What it does:** On mount, checks if `gameStatus` is not `"waiting"` (leftover from a previous game). If stale, automatically resets all Liveblocks Storage fields (gameStatus, ghostId, hostPlayerId, editorContent, fakedTasks, activeVote) back to defaults.

---

## 3. DSA Task Bank

### 3.1 Dual Task Sets

- **Library:** `lib/taskBank.ts`
- **What it does:** Two complete task sets selected by the room code's last character:
  - **Set A (Graph / BFS / Trees)** — loaded when the last character has an even char code (digits 0,2,4,6,8 or letters B,D,F,H...).
  - **Set B (Dynamic Programming / Optimization)** — loaded when the last character has an odd char code.
- **Purpose:** Keeps the game fresh for players doing multiple rounds. Same room code always gives the same set.

### 3.2 Set A — Graph / BFS / Trees

- **Stage 1 (0:00–1:30):** Missing semicolon (`server_init.ts`), unclosed JSX tag (`dashboard.tsx`), method typo `listn` → `listen` (`ws_handler.ts`).
- **Stage 2 (1:30–3:00):** Assignment vs comparison `=` → `===` (`auth_check.ts`), BFS visited-set bug — marks after dequeue instead of before enqueue (`graph_bfs.ts`), Dijkstra distance init `0` → `Infinity` (`shortest_path.ts`).
- **Stage 3 (3:00–4:00):** Tree recursion missing null base case — stack overflow (`tree_depth.ts`), linked list delete doesn't update `next` pointer — memory leak (`linked_list.ts`).

### 3.3 Set B — Dynamic Programming / Optimization

- **Stage 1 (0:00–1:30):** Missing closing bracket in destructuring (`config_parser.ts`), arrow function `{}` without return (`event_bus.ts`), string concatenation instead of template literal (`logger.ts`).
- **Stage 2 (1:30–3:00):** Fibonacci memo cache never read — exponential time (`fibonacci.ts`), 0/1 Knapsack reads `dp[i]` instead of `dp[i-1]` for skip case (`knapsack.ts`), Kadane's algorithm resets to `0` instead of current element (`max_subarray.ts`).
- **Stage 3 (3:00–4:00):** LCS match case uses `1` instead of `dp[i-1][j-1] + 1` — misses diagonal (`lcs.ts`), Coin Change DP filled with `0` instead of `Infinity` — every amount looks reachable (`coin_change.ts`).

### 3.4 Staged Difficulty

- **Component:** `GameEditor.tsx`
- **What it does:** Tasks unlock automatically as time progresses. Stage 1 tasks are available immediately. Stage 2 unlocks at 1:30. Stage 3 unlocks at 3:00. Locked tasks show a padlock icon and a "Unlocks at Stage X" overlay in the editor. A stage indicator in the sidebar shows the current stage with color coding (green → yellow → red). The terminal announces stage transitions.
- **UI Element:** Stage badge in sidebar, lock icons on locked tasks, locked editor overlay.

---

## 4. Editor Workspace (Zed IDE Mockup)

### 4.1 Task Sidebar

- **Component:** `GameEditor.tsx` (left panel)
- **What it does:** Shows the task list with file names, fix status (red circle / green check / lock icon), and stage labels (S1/S2/S3). The task set label ("Graph / BFS / Trees" or "Dynamic Programming / Optimization") is shown at the top. A "Current Task" description panel at the bottom explains the active bug.
- **UI Element:** 224px-wide sidebar on the left of the editor area.

### 4.2 Code Editor

- **Component:** `GameEditor.tsx` (center panel)
- **What it does:** A textarea with syntax highlighting overlay (keywords, strings, comments, numbers, types, operators), line numbers, and a minimap. Code content is synced in real-time across all players via Liveblocks Storage (`editorContent` record). Supports TypeScript/JSX syntax highlighting with expanded keyword set.
- **UI Element:** Central editor area with tab bar showing active file name and stage label.

### 4.3 Real-time Player Cursors

- **Component:** `GameEditor.tsx` (inline) + `PhantomCursors.tsx`
- **What it does:** Each player's cursor position (line/col) is tracked via Liveblocks Presence and updated on click/keyup. Other players see colored cursor lines with name tags. Phantom cursors (from Ghost ability) are visually indistinguishable from real ones and move randomly.
- **UI Element:** Colored vertical bars with name labels floating over the code.

### 4.4 Win Condition Check

- **Component:** `GameEditor.tsx` (`updateContent` mutation)
- **What it does:** Every time a player edits code, the Liveblocks mutation checks ALL tasks (across all stages) against their `fixedCode`. If every task matches, it sets `gameStatus: "engineers-win"` in Storage. Plays a "task fixed" sound when individual tasks are completed.

### 4.5 Engineer Utilities

#### 4.5.1 Snapshot

- **Component:** `GameEditor.tsx`
- **What it does:** Engineers can click "Take Snapshot" to save the current state of all code files. "Revert to Snapshot" restores all files to the saved state, undoing any Ghost sabotage that happened since the snapshot. 30-second cooldown.
- **UI Element:** Two buttons in the sidebar below the task list (engineer only).

#### 4.5.2 Security Scan

- **Component:** `GameEditor.tsx`
- **What it does:** Compares current code against both the original buggy code and the correct fixed code for each task. Lines that match neither = Ghost edits. Highlights suspicious lines with red line numbers, red left border, and red minimap markers. Results persist for 45 seconds. 45-second cooldown.
- **UI Element:** "Security Scan" button in the sidebar (engineer only). Red highlights in editor.

---

## 5. Game HUD (Heads-Up Display)

### 5.1 Timer Countdown

- **Component:** `GameHUD.tsx`
- **What it does:** Counts down from 4:00 (240 seconds). When it hits 0, the Ghost wins (synced to Liveblocks via `useMutation`). Visual escalation: yellow at < 60s, red at < 30s, pulsing/bold with spinning clock icon at < 10s. Syncs `ghost-wins` to Liveblocks Storage when timer or paranoia triggers game end.
- **UI Element:** Top-right corner, stacked badge showing `M:SS`.

### 5.2 Role Badge

- **Component:** `GameHUD.tsx`
- **What it does:** Shows "Ghost" (red, Ghost icon) or "Engineer" (purple, Shield icon) so the player always knows their role.
- **UI Element:** Top-right corner, below the timer.

### 5.3 Bugs Fixed Progress

- **Component:** `GameHUD.tsx`
- **What it does:** Shows "Bugs Fixed: X/Y" with a green progress bar. Y changes as new stages unlock.
- **UI Element:** Top-right corner, below the role badge.

### 5.4 Paranoia Meter

- **Component:** `GameHUD.tsx`
- **What it does:** Shows the current paranoia level (0–100%) with a colored progress bar (purple → yellow → red). At > 70%, the border pulses red. If paranoia reaches 100%, the Ghost wins.
- **UI Element:** Top-right corner, bottom of the HUD stack.

---

## 6. Ghost Abilities (Ghost Only)

### 6.1 Ghost Controls Panel

- **Component:** `GhostControls.tsx`
- **What it does:** A hidden panel toggled with the backtick (`` ` ``) key. Contains 6 stealth abilities. All abilities are completely silent — no terminal messages, no alerts to engineers. Each ability has a cooldown timer shown when on cooldown. Uses the room-specific task set.
- **UI Element:** Floating panel at bottom-center of the editor area. Only visible to the Ghost when toggled.

### 6.2 Inject Bug

- **What it does:** Silently reverts a random already-fixed task back to its buggy code in Liveblocks Storage. Engineers don't get any notification — they discover later that a task they fixed is broken again.
- **Cooldown:** 20 seconds. **Paranoia gain:** +5.

### 6.3 Fake Fix

- **What it does:** Makes a random unfixed task appear as "fixed" (green checkmark) for 15 seconds. Engineers waste time thinking it's done. The Ghost sees the real status. After 15s, the fake wears off.
- **Cooldown:** 25 seconds. **Paranoia gain:** +3.

### 6.4 Blackout

- **What it does:** Triggers a 5-second full-screen dark overlay for all engineers. Engineers see "[SYSTEM FAILURE] Power grid offline..." text. The Ghost sees a semi-transparent overlay and can still edit code. A low rumble sound plays.
- **Cooldown:** 45 seconds. **Paranoia gain:** +8.
- **Component:** `BlackoutOverlay.tsx`

### 6.5 Phantom Cursor

- **What it does:** Spawns a fake cursor with a random player name and color that moves around the editor for 6 seconds. Engineers can't tell it apart from a real player's cursor. The phantom moves randomly every 800ms.
- **Cooldown:** 12 seconds. **Paranoia gain:** +2.
- **Component:** `PhantomCursors.tsx`

### 6.6 Subtle Corrupt

- **What it does:** Swaps a single character in a random task's code. Swaps include: `===` → `==`, `==` → `=`, `;` → nothing, `(` → `[`, `)` → `]`, `const` → `let`, `true` → `false`, `.` → `,`, `!==` → `===`. Very hard for engineers to spot.
- **Cooldown:** 15 seconds. **Paranoia gain:** +4.

### 6.7 Variable Scrambler

- **What it does:** Renames a common variable in a random task's code with a subtle typo. Examples: `node` → `nde`, `result` → `reslt`, `current` → `currnt`, `target` → `targt`, `visited` → `visted`, `queue` → `queu`, `head` → `hed`, `depth` → `dpth`. Breaks the code without being immediately obvious.
- **Cooldown:** 45 seconds. **Paranoia gain:** +6.

---

## 7. Voice System

### 7.1 Ghost Haunt Voice (Hold to Speak)

- **Component:** `GhostHauntButton.tsx`
- **What it does:** Ghost-only button. When held (mouse or touch), records the Ghost's microphone via MediaRecorder API. On release, sends the audio blob + elapsed game time to `/api/voice` which proxies it to ElevenLabs Speech-to-Speech API. The returned "demon voice" audio is converted to base64 and broadcast to all players via Liveblocks `useBroadcastEvent`. Every player hears the distorted voice.
- **Minimum recording:** 500ms (shorter clips are silently discarded).
- **UI Element:** Floating button on the right side. Shows "Recording..." while held, "Distorting..." while processing.

### 7.2 Audio Climax

- **Route:** `api/voice/route.ts`
- **What it does:** Voice settings change based on elapsed game time:
  - **0:00–3:00:** Low stability (0.3), high similarity (0.8), no speaker boost → eerie, distorted, inhuman.
  - **3:00–4:00:** High stability (0.7), very high similarity (0.95), speaker boost ON → terrifyingly clear and human-like. The Ghost's voice becomes more "real" as the game reaches its climax.

### 7.3 Demon Voice Listener

- **Component:** `DemonVoiceListener.tsx`
- **What it does:** Mounted by engineer players. Listens for `demon-voice` broadcast events and auto-plays the base64-encoded audio at 80% volume. Engineers hear the Ghost's distorted voice without knowing who sent it.
- **UI Element:** None (invisible listener).

---

## 8. Voting / Accusation System

### 8.1 Call Vote Button

- **Component:** `VotePanel.tsx`
- **What it does:** Any player (including the Ghost, to blend in) can click "Call Vote" to open a dropdown of other players. Selecting a player starts a vote accusing them of being the Ghost. 60-second cooldown between votes.
- **UI Element:** Small yellow button at top-left of the editor area.

### 8.2 Vote Overlay

- **Component:** `VotePanel.tsx`
- **What it does:** When a vote is active, a semi-transparent overlay appears for ALL players (including the Ghost) showing "Is [name] the Ghost?" with "Guilty" and "Innocent" buttons. The vote expires after 15 seconds. Shows vote count progress (X/total).
- **Resolution:**
  - Majority "Guilty" + correct accusation → Engineers win immediately.
  - Majority "Guilty" + wrong accusation → 30 seconds deducted from the timer.
  - Majority "Innocent" or timeout → Vote dismissed, no penalty.
- **Note:** The Ghost can vote too — they should vote "Innocent" on themselves or strategically vote "Guilty" on an engineer to cause confusion.
- **UI Element:** Centered overlay with Guilty/Innocent buttons.

---

## 9. Sound Effects

### 9.1 Sound Engine

- **Component:** `SoundEngine.tsx` + `lib/sounds.ts`
- **What it does:** Procedural Web Audio API sounds (no audio files needed). Listens for SFX broadcast events and plays sounds. Manages the ambient drone.
- **Sounds:**
  - **Task Fixed:** Short ascending "ding" (sine wave 880Hz → 1320Hz, 0.4s).
  - **Blackout:** Low rumble (sawtooth 60Hz → 30Hz, 2s).
  - **Vote Called:** Three-note alert chime (triangle wave 660/880/1100Hz).
  - **Time Warning:** Urgent beep at 30s, 10s, and 5s remaining (square wave 440Hz, 0.15s).
  - **Game Over:** Dramatic descending four-note tone (sawtooth 440/370/311/261Hz).

### 9.2 Ambient Drone

- **Component:** `SoundEngine.tsx` + `lib/sounds.ts`
- **What it does:** Two slightly detuned sine oscillators (55Hz and 57Hz) with an LFO (0.3Hz) modulating the gain. Creates a subtle, unsettling background hum that plays throughout the game. Starts when `phase === "playing"` and stops on unmount.

---

## 10. In-Game Chat

### 10.1 Team Chat

- **Component:** `GameChat.tsx`
- **What it does:** Collapsible text chat panel. Messages are broadcast via Liveblocks `useBroadcastEvent` (not persisted). Player names are shown in their assigned color. The Ghost can use chat to blend in and mislead engineers ("I think the bug is on line 3"). System messages appear for task fixes.
- **Features:** 200 character limit, keeps last 50 messages, unread badge when minimized, auto-scroll on new messages.
- **UI Element:** Floating panel on the right side of the editor area.

---

## 11. Paranoia Visual Effects

### 11.1 Progressive UI Distortion

- **Component:** `ParanoiaEffects.tsx`
- **What it does:** As the paranoia meter increases, the UI progressively distorts:
  - **30%+:** Subtle color gradient overlay shifts across the screen (mix-blend-overlay).
  - **50%+:** Random micro-glitch lines (1px red bars) flash across the screen every 2–5 seconds.
  - **70%+:** Cursor caret color randomly alternates between red and purple via injected CSS.
  - **80%+:** Screen tearing effect — horizontal black bars flash for 100ms every 4–8 seconds.
  - **80%+ (CSS):** The entire game container gets a pulsing red border (`paranoia-border` animation).

---

## 12. Role Reveal

### 12.1 Role Banner

- **Component:** `RoleBanner.tsx`
- **What it does:** Full-screen overlay shown for 4 seconds when the game starts. Ghost sees a red screen with "You are the Ghost — Sabotage the system. Use your abilities to raise paranoia and prevent the engineers from fixing the bugs." Engineers see a purple screen with "You are an Engineer — Fix the 5 bugs in the codebase before time runs out. Watch out for the Ghost." Click anywhere to dismiss early.
- **UI Element:** Fixed full-screen overlay with z-index 100.

---

## 13. Game Over

### 13.1 Game Over Overlay

- **Component:** `GameOverlay.tsx`
- **What it does:** Shows when the game ends (engineers-win or ghost-wins). Displays a trophy (green) or skull (red) icon, the result message, and reveals who the Ghost was by name. Two buttons: "Play Again" resets Liveblocks Storage and returns to the lobby (same room code). "Home" navigates back to `/` to create or join a new room.
- **UI Element:** Full-screen overlay with result, ghost reveal, and action buttons.

---

## 14. Terminal

### 14.1 In-Game Terminal

- **Component:** `Terminal.tsx`
- **What it does:** A collapsible terminal panel at the bottom of the editor. Shows game system messages (game start, stage transitions, bug fixes, game over). Has a command input that supports `help`, `status`, and `clear` commands. Colored output (red for errors/fatal, yellow for warnings, green for success, purple for commands, violet for system prompts).
- **UI Element:** 192px-tall panel at the bottom, collapsible to 32px header.

---

## 15. Status Bar

### 15.1 Bottom Status Bar

- **Component:** `StatusBar.tsx`
- **What it does:** Shows git branch (decorative "main"), error count for current file, bugs fixed count, paranoia percentage, online player count (from Liveblocks `useOthers().length + 1`), file type (TypeScript/TypeScript React), and encoding (UTF-8). Purple background matching the Zed IDE theme.
- **UI Element:** 24px-tall bar at the very bottom of the screen.

---

## 16. Infrastructure

### 16.1 Liveblocks Real-time

- **Config:** `liveblocks.config.ts` + `Room.tsx`
- **Presence:** `name`, `playerId`, `isReady`, `color`, `cursor { line, col }`.
- **Storage:** `gameStatus`, `ghostId`, `hostPlayerId`, `editorContent` (Record), `fakedTasks` (Record), `activeVote` (object | null).
- **RoomEvent (broadcast):** `demon-voice` (base64 audio), `blackout` (duration), `phantom-cursor` (position/color/name/duration), `chat` (message), `sfx` (sound name).

### 16.2 Supabase Persistence

- **Config:** `lib/supabase.ts`
- **Table:** `profiles` — columns: `id` (text PK), `name` (text), `created_at` (timestamptz), `games_played` (int), `wins` (int).
- **RLS:** SELECT/INSERT/UPDATE allowed for `anon` role.
- **Client:** Uses the legacy anon JWT key (not the new publishable key).

### 16.3 ElevenLabs Voice API

- **Route:** `api/voice/route.ts` — Speech-to-Speech proxy with time-based voice settings (Audio Climax feature).
- **Route:** `api/sfx/route.ts` — Sound Effects generation from text prompts.
- **Env vars:** `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.

### 16.4 Liveblocks Auth

- **Route:** `api/liveblocks-auth/route.ts`
- **What it does:** Server-side authentication endpoint. Issues session tokens with `room-*` wildcard access. Uses `@liveblocks/node` with `LIVEBLOCKS_SECRET_KEY`.

### 16.5 Room Cleanup Cron

- **Route:** `api/cleanup-rooms/route.ts`
- **What it does:** GET endpoint secured with `CRON_SECRET`. Paginates all Liveblocks rooms, checks active users via API, deletes rooms with 0 players. Call hourly via Vercel Cron or external service.

---

## 17. Environment Variables

| Variable                        | Exposed to Browser | Purpose                                  |
| ------------------------------- | ------------------ | ---------------------------------------- |
| `LIVEBLOCKS_SECRET_KEY`         | No                 | Liveblocks server-side auth              |
| `NEXT_PUBLIC_SUPABASE_URL`      | Yes                | Supabase project URL                     |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes                | Supabase anon JWT key (public by design) |
| `ELEVENLABS_API_KEY`            | No                 | ElevenLabs API authentication            |
| `ELEVENLABS_VOICE_ID`           | No                 | ElevenLabs voice for Ghost distortion    |
| `CRON_SECRET`                   | No                 | Secures the cleanup cron endpoint        |

---

## UI Layout Summary

| Position                 | Elements                                                                                                                                          |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Top bar                  | Window controls (decorative), title "Ghost in the Machine — [ROOM_CODE]"                                                                          |
| Left sidebar             | Task set label, stage indicator, task list (8 files with lock/fix status), current task description, engineer utilities (Snapshot, Security Scan) |
| Center                   | Tab bar (file name + stage label), code editor with line numbers + syntax highlighting + minimap + player cursors                                 |
| Top-right (stacked)      | Timer, role badge, bugs fixed progress, paranoia meter                                                                                            |
| Right side (floating)    | Team Chat panel, Haunt Voice button (Ghost only)                                                                                                  |
| Bottom-center (floating) | Ghost Abilities panel (Ghost only, toggled with `` ` ``)                                                                                          |
| Top-left (floating)      | Call Vote button                                                                                                                                  |
| Bottom                   | Terminal (collapsible), status bar                                                                                                                |
| Full-screen overlays     | Role banner, blackout, vote panel, paranoia effects, game over                                                                                    |
