# Ghost in the Machine — Feature Roadmap

Everything below is NOT yet built. These are ideas organized by priority and effort.

---

## 🔥 High Impact / Should Build Next

### 1. Post-Game Replay

- After the game ends, show a timeline of everything the Ghost did: which abilities they used, when, and on which files.
- Engineers can see exactly how they were sabotaged.
- Shows a "Ghost Activity Log" with timestamps like: `0:45 — Injected bug into graph_bfs.ts`, `1:12 — Corrupted a semicolon in auth_check.ts`.
- Adds replay value and "aha!" moments.

### 2. Game History & Leaderboard

- Save game results to Supabase after each round: room code, players, who was ghost, winner, duration, tasks fixed.
- Player profile page showing win/loss record, times as ghost vs engineer, average game duration.
- Global leaderboard: top ghost players (most wins as ghost), top engineers (fastest bug fixes).

### 3. Spectator Mode

- Players who join a full room (5th player) can watch the game live as a spectator.
- Spectators see all players' code edits in real-time but can't type or vote.
- Spectators can see who the Ghost is (like watching a horror movie).

### 4. Mobile Responsive Layout

- Current UI is desktop-only. Make the editor, sidebar, HUD, and chat work on tablets and phones.
- Collapse sidebar into a drawer on small screens.
- Stack HUD elements horizontally on mobile.
- Touch-friendly vote buttons and ghost abilities.

### 5. Deploy to Vercel

- Add `vercel.json` with cron config for room cleanup.
- Set up environment variables in Vercel dashboard.
- Custom domain setup.
- Add Open Graph meta tags for link previews when sharing room codes.

---

## 🎮 Gameplay Enhancements

### 6. Ghost Ability Unlock Progression

- Not all abilities available from the start.
- Stage 1 (0:00–1:30): Only Corrupt and Phantom Cursor available.
- Stage 2 (1:30–3:00): Inject Bug and Fake Fix unlock.
- Stage 3 (3:00–4:00): Blackout and Variable Scrambler unlock.
- Creates a power curve — Ghost gets stronger as time runs out.

### 7. Engineer Roles / Specializations

- When the game starts, each engineer gets a random specialization:
  - **Debugger** — Security Scan cooldown reduced to 20s.
  - **Architect** — Can see which file was last edited and by whom.
  - **Ops** — Snapshot cooldown reduced to 15s, can take 3 snapshots.
- Adds variety and encourages teamwork.

### 8. Multiple Ghosts Mode

- For 6-8 player games, assign 2 ghosts.
- Ghosts don't know who the other ghost is.
- Ghosts can accidentally sabotage each other's work.
- Voting becomes harder — need to find both ghosts.

### 9. Difficulty Presets

- **Easy:** 5 minutes, 6 tasks, Ghost cooldowns are longer.
- **Normal:** 4 minutes, 8 tasks (current).
- **Hard:** 3 minutes, 8 tasks, Ghost cooldowns are shorter, paranoia rises faster.
- **Nightmare:** 2.5 minutes, 10 tasks, 2 ghosts, no Security Scan.
- Host selects difficulty in the lobby before starting.

### 10. Task Hints System

- Engineers can spend 15 seconds of game time to "buy" a hint for the current task.
- Hint shows which line number has the bug (but not what the fix is).
- Limited to 3 hints per game across all engineers.
- Creates a risk/reward tradeoff — spend time for information.

### 11. Ghost Traps

- Ghost can place invisible "traps" on specific files.
- When an engineer opens a trapped file, their screen glitches for 2 seconds.
- Trap is consumed after triggering (one-time use).
- Ghost gets 2 traps per game.

### 12. Code Review Phase

- After all tasks are "fixed", a 30-second Code Review phase begins.
- Engineers must confirm each fix is correct before the win is counted.
- If the Ghost corrupted a "fixed" task during the game, engineers might approve broken code and lose.
- Adds a final tension moment.

---

## 🎨 UI / UX Polish

### 13. Animated Transitions

- Smooth transitions between lobby → role reveal → editor.
- Task sidebar items animate in when new stages unlock.
- Ghost abilities panel slides up with a subtle animation.
- Vote overlay fades in with a dramatic blur effect.

### 14. Player Avatars

- Let players pick from 8-10 pixel art avatars in the lobby.
- Avatars shown next to names in the player list, chat, and cursors.
- Ghost gets a special avatar reveal at game end.

### 15. Theme Variants

- **Default:** Dark purple (current Zed-like theme).
- **Blood Moon:** Deep red accents, more horror-focused.
- **Matrix:** Green-on-black terminal aesthetic.
- **Retro CRT:** Scanlines always on, amber text, old-school feel.
- Host picks theme in lobby, applies to all players.

### 16. Sound Settings

- Volume slider for ambient drone, SFX, and voice separately.
- Mute all button.
- Option to disable jump-scare sounds (accessibility).

### 17. Accessibility

- Keyboard navigation for all buttons and panels.
- Screen reader labels for game state (role, timer, paranoia).
- High contrast mode option.
- Reduce motion option (disables glitch/paranoia effects).

---

## 🔧 Technical / Infrastructure

### 18. Persistent Game History in Supabase

- `games` table: id, room_code, created_at, duration, winner, ghost_player_id.
- `game_players` table: game_id, player_id, role, tasks_fixed.
- Write results on game end via a Server Action or API route.

### 19. Room Code Sharing via QR

- Generate a QR code for the room URL.
- Display it in the lobby so players can scan from their phones.
- Useful for in-person game sessions.

### 20. Anti-Cheat Measures

- Rate-limit Ghost abilities server-side (not just client cooldowns).
- Validate code edits server-side to prevent direct Storage manipulation.
- Detect if a player opens DevTools and flags them (fun, not punitive).

### 21. Analytics Dashboard

- Track: games played per day, average game duration, ghost win rate vs engineer win rate.
- Most used ghost abilities.
- Most commonly failed tasks.
- Use Supabase views or a simple admin page.

### 22. WebRTC Voice Chat

- Replace the ElevenLabs-only voice with full WebRTC voice chat between all players.
- Ghost's voice still gets routed through ElevenLabs for distortion.
- Engineers can talk to each other normally.
- Push-to-talk for everyone.

### 23. Custom Task Editor

- Let the host create custom buggy/fixed code pairs in the lobby.
- Upload a JSON file with custom tasks.
- Share task packs with other players.
- Community task library.

### 24. Twitch/YouTube Integration

- Overlay mode for streamers showing game state, timer, and paranoia.
- Audience can vote on who they think the Ghost is (poll integration).
- Chat commands to trigger minor visual effects.

---

## 📊 Priority Matrix

| Feature                    | Impact | Effort    | Priority   |
| -------------------------- | ------ | --------- | ---------- |
| Post-Game Replay           | High   | Medium    | ⭐⭐⭐⭐⭐ |
| Game History & Leaderboard | High   | Medium    | ⭐⭐⭐⭐⭐ |
| Deploy to Vercel           | High   | Low       | ⭐⭐⭐⭐⭐ |
| Mobile Responsive          | High   | High      | ⭐⭐⭐⭐   |
| Ghost Ability Progression  | High   | Low       | ⭐⭐⭐⭐   |
| Difficulty Presets         | Medium | Low       | ⭐⭐⭐⭐   |
| Spectator Mode             | Medium | Medium    | ⭐⭐⭐     |
| Sound Settings             | Medium | Low       | ⭐⭐⭐     |
| Player Avatars             | Low    | Medium    | ⭐⭐       |
| Theme Variants             | Low    | Medium    | ⭐⭐       |
| Custom Task Editor         | Medium | High      | ⭐⭐       |
| WebRTC Voice Chat          | High   | Very High | ⭐⭐       |
| Twitch Integration         | Low    | High      | ⭐         |
