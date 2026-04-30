"use client";

import {
  Ghost,
  Shield,
  Clock,
  Skull,
  Trophy,
  ArrowLeft,
  ArrowRight,
  Bug,
  EyeOff,
  Zap,
  Monitor,
  MousePointer,
  Camera,
  ScanSearch,
  Vote,
  ShieldCheck,
  Check,
  X,
} from "lucide-react";
import Link from "next/link";

export default function RulesPage() {
  return (
    <div
      className="min-h-screen w-screen bg-surface-deep overflow-y-auto"
      style={{ height: "100vh", overflowY: "auto" }}
    >
      {/* Header */}
      <div className="sticky top-0 z-10 bg-surface-deep/95 backdrop-blur-sm border-b border-border">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-sm text-text-muted hover:text-accent-soft transition-colors"
          >
            <ArrowLeft size={16} />
            Back
          </Link>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <Ghost size={20} className="text-accent-soft" />
            <span className="text-sm font-bold text-text-primary">
              Game Rules
            </span>
          </div>
          <div className="flex-1" />
          <div className="w-14" />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 py-12 space-y-14">
        {/* Intro */}
        <section className="text-center space-y-5">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-lg border border-accent/40 bg-accent/5 mb-2">
            <Ghost size={40} className="text-accent-soft" />
          </div>
          <h1 className="text-3xl font-bold text-text-primary">
            Ghost in the Machine
          </h1>
          <p className="text-sm text-text-muted max-w-lg mx-auto leading-relaxed">
            A real-time multiplayer social deduction game where engineers race
            to fix bugs while a hidden ghost sabotages the codebase.
          </p>
        </section>

        {/* Overview */}
        <Section title="How It Works">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <InfoCard
              icon={<Shield size={28} className="text-accent-soft" />}
              title="Engineers"
              description="Fix all 3 broken files in the codebase before time runs out. Verify the system to win."
              borderClass="border-accent/30 bg-accent/5"
              titleClass="text-accent-soft"
            />
            <InfoCard
              icon={<Ghost size={28} className="text-ghost" />}
              title="The Ghost"
              description="Sabotage the code, raise paranoia, and prevent engineers from fixing the bugs. Stay hidden."
              borderClass="border-ghost/30 bg-ghost/5"
              titleClass="text-ghost"
            />
            <InfoCard
              icon={<Clock size={28} className="text-warning" />}
              title="4 Minutes"
              description="The clock is ticking. Engineers must fix and verify all files before time expires."
              borderClass="border-warning/30 bg-warning/5"
              titleClass="text-warning"
            />
          </div>
        </Section>

        {/* Game Flow */}
        <Section title="Game Flow">
          <ol className="space-y-5">
            <Step number={1} title="Create or Join a Room">
              One player creates a game and shares the 6-character room code. Up
              to 4 players can join. Everyone readies up.
            </Step>
            <Step number={2} title="Roles Are Assigned">
              When the host starts the game, one random player becomes the
              Ghost. Everyone else is an Engineer. You see your role for 4
              seconds — then the game begins.
            </Step>
            <Step number={3} title="The Scenario Loads">
              An AI generates a unique 3-file broken system (or a pre-built
              scenario is used as fallback). Files unlock in stages as time
              progresses.
            </Step>
            <Step number={4} title="Engineers Fix, Ghost Sabotages">
              Engineers collaborate in real-time to find and fix bugs in each
              file. The Ghost secretly uses abilities to break code, fake
              progress, and sow distrust.
            </Step>
            <Step number={5} title="Verify the System">
              Engineers click &quot;Verify System&quot; to run tests on all
              files. Files are tested in dependency order — if a dependency
              fails, dependent files are blocked. All 3 must pass to win.
            </Step>
            <Step number={6} title="Someone Wins">
              Engineers win by verifying all files or correctly voting out the
              Ghost. The Ghost wins if time runs out, paranoia hits 100%, or
              engineers vote out the wrong player.
            </Step>
          </ol>
        </Section>

        {/* Stages */}
        <Section title="Staged Difficulty">
          <p className="text-sm text-text-muted mb-5">
            Files unlock over time. Each stage introduces harder bugs.
          </p>
          <div className="space-y-3">
            <StageRow
              stage={1}
              time="0:00 – 1:30"
              label="Foundation"
              description="Syntax bugs — missing semicolons, typos, unclosed tags"
              color="text-success-light"
              bg="bg-success/10 border-success/30"
            />
            <StageRow
              stage={2}
              time="1:30 – 3:00"
              label="Integration"
              description="Logic bugs — wrong comparisons, off-by-one errors, cache misses"
              color="text-warning-light"
              bg="bg-warning/10 border-warning/30"
            />
            <StageRow
              stage={3}
              time="3:00 – 4:00"
              label="System"
              description="Algorithmic bugs — missing null checks, wrong error handling, broken chains"
              color="text-ghost-light"
              bg="bg-ghost/10 border-ghost/30"
            />
          </div>
          <p className="text-xs text-text-subtle mt-4">
            Files form a dependency chain — Stage 2 depends on Stage 1, Stage 3
            depends on Stage 2.
          </p>
        </Section>

        {/* Win Conditions */}
        <Section title="Win Conditions">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <div className="border border-success/30 bg-success/5 p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Trophy size={20} className="text-success" />
                <span className="text-sm font-bold text-success">
                  Engineers Win
                </span>
              </div>
              <ul className="space-y-3 text-sm text-text-muted">
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-success mt-0.5 shrink-0" />
                  All 3 files pass verification (system becomes operational)
                </li>
                <li className="flex items-start gap-2">
                  <Check size={14} className="text-success mt-0.5 shrink-0" />
                  Correctly vote out the Ghost (majority guilty vote on the
                  actual Ghost)
                </li>
              </ul>
            </div>
            <div className="border border-ghost/30 bg-ghost/5 p-6 rounded-lg space-y-4">
              <div className="flex items-center gap-2">
                <Skull size={20} className="text-ghost" />
                <span className="text-sm font-bold text-ghost">Ghost Wins</span>
              </div>
              <ul className="space-y-3 text-sm text-text-muted">
                <li className="flex items-start gap-2">
                  <X size={14} className="text-ghost mt-0.5 shrink-0" />
                  Timer reaches 0:00
                </li>
                <li className="flex items-start gap-2">
                  <X size={14} className="text-ghost mt-0.5 shrink-0" />
                  Paranoia meter reaches 100%
                </li>
                <li className="flex items-start gap-2">
                  <X size={14} className="text-ghost mt-0.5 shrink-0" />
                  Engineers vote out the wrong player (-30 seconds penalty)
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Ghost Abilities */}
        <Section title="Ghost Abilities">
          <p className="text-sm text-text-muted mb-5">
            The Ghost has 5 silent abilities. None alert the engineers directly.
            Each one also broadcasts a fake system warning blaming a random
            engineer.
          </p>
          <div className="mb-4 px-4 py-3 rounded-lg bg-ghost/10 border border-ghost/30">
            <p className="text-xs text-ghost-light">
              <strong>Ghost Edit Restriction:</strong> The Ghost can edit code
              directly but is limited to changing{" "}
              <strong>5 lines maximum</strong> per edit. Mass deletions (Ctrl+A
              → Delete) are also blocked. This keeps sabotage subtle and
              strategic.
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AbilityCard
              icon={<Bug size={16} />}
              name="Inject Bug"
              cooldown="20s"
              paranoia="+5"
              description="Reverts a verified file back to buggy code. Cascades — all dependent files are also invalidated."
            />
            <AbilityCard
              icon={<EyeOff size={16} />}
              name="Fake Fix"
              cooldown="25s"
              paranoia="+3"
              description="Makes an unverified file appear as 'verified' for 15 seconds. Engineers waste time thinking it's done."
            />
            <AbilityCard
              icon={<Zap size={16} />}
              name="Blackout"
              cooldown="45s"
              paranoia="+8"
              description="5-second full-screen dark overlay for all engineers. The Ghost can still see and edit code."
            />
            <AbilityCard
              icon={<Monitor size={16} />}
              name="Screen Glitch"
              cooldown="30s"
              paranoia="+6"
              description="3-second screen distortion with RGB splits, tearing, and static noise. Disorienting for engineers."
            />
            <AbilityCard
              icon={<MousePointer size={16} />}
              name="Phantom Cursor"
              cooldown="12s"
              paranoia="+2"
              description="Spawns a fake cursor with a real engineer's name that moves around for 6 seconds."
            />
          </div>
        </Section>

        {/* Engineer Tools */}
        <Section title="Engineer Tools">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <ToolCard
              icon={<ShieldCheck size={16} />}
              name="Verify System"
              cooldown="—"
              description="Run tests on all files in dependency order. All 3 must pass to win. Blocked files can't be tested until their dependencies pass."
            />
            <ToolCard
              icon={<Camera size={16} />}
              name="Take Snapshot"
              cooldown="30s"
              description="Save the current state of all files. Use 'Revert System' to undo Ghost sabotage."
            />
            <ToolCard
              icon={<ScanSearch size={16} />}
              name="Security Scan"
              cooldown="45s"
              description="Scans code for lines that don't match the original or the fix — reveals Ghost edits."
            />
            <ToolCard
              icon={<Vote size={16} />}
              name="Emergency Vote"
              cooldown="60s"
              description="Accuse a player of being the Ghost. Majority guilty = instant win (if correct) or -30s penalty (if wrong)."
            />
          </div>
        </Section>

        {/* Paranoia */}
        <Section title="Paranoia System">
          <p className="text-sm text-text-muted mb-5">
            Paranoia rises automatically and from Ghost abilities. At 100%, the
            Ghost wins instantly.
          </p>
          <div className="space-y-2">
            <ParanoiaRow
              label="Auto"
              value="+0.1/sec normally, +0.3/sec in final 60 seconds"
            />
            <ParanoiaRow
              label="Fix a bug"
              value="-10 paranoia"
              valueClass="text-success"
            />
            <ParanoiaRow label="30%+" value="Subtle color shifts on the UI" />
            <ParanoiaRow
              label="50%+"
              value="Random micro-glitch lines flash across the screen"
            />
            <ParanoiaRow
              label="60%+"
              value="Eerie whispers start playing for engineers"
            />
            <ParanoiaRow
              label="70%+"
              value="Cursor color glitches, pulsing red border"
            />
            <ParanoiaRow label="80%+" value="Screen tearing effects" />
            <div className="flex items-center gap-4 px-5 py-3 rounded-lg border border-ghost/30 bg-ghost/5">
              <span className="text-ghost font-bold w-24 text-sm">100%</span>
              <span className="text-ghost font-bold text-sm">
                Ghost wins instantly
              </span>
            </div>
          </div>
        </Section>

        {/* Voice */}
        <Section title="Voice & Audio">
          <div className="space-y-3">
            <AudioRow
              title="Ghost Voice"
              titleClass="text-ghost"
              borderClass="border-ghost/20 bg-ghost/5"
              description="Click to record your voice. It gets distorted into a demon voice and broadcast to all players. Gets clearer in the final minute."
            />
            <AudioRow
              title="Demon Taunts"
              titleClass="text-ghost"
              borderClass="border-ghost/20 bg-ghost/5"
              description="8 pre-written taunts plus a custom text input. Messages get converted to AI demon speech. 10-second cooldown."
            />
            <AudioRow
              title="Paranoia Whispers"
              titleClass="text-accent-soft"
              borderClass="border-accent/20 bg-accent/5"
              description="Engineers hear eerie AI-generated whispers when paranoia is above 60%. They get louder as paranoia rises."
            />
            <AudioRow
              title="Ambient Music"
              titleClass="text-text-secondary"
              borderClass="border-border/50 bg-surface"
              description="Three AI-generated ambient layers (calm, tense, critical) crossfade based on paranoia level."
            />
            <AudioRow
              title="Dynamic Narrator"
              titleClass="text-info"
              borderClass="border-info/20 bg-info/5"
              description="AI narrator announces key moments: file corrupted, file verified, stage unlocks, votes, time warnings."
            />
          </div>
        </Section>

        {/* Tips */}
        <Section title="Strategy Tips">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-accent-soft">
                For Engineers
              </h4>
              <ul className="space-y-3 text-sm text-text-muted leading-relaxed">
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-accent-soft mt-0.5 shrink-0"
                  />
                  Take snapshots early — they save you from sabotage
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-accent-soft mt-0.5 shrink-0"
                  />
                  Watch the Edit Activity Log for suspicious large edits
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-accent-soft mt-0.5 shrink-0"
                  />
                  Use Security Scan to detect Ghost modifications
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-accent-soft mt-0.5 shrink-0"
                  />
                  Fix files in order — Stage 1 first, since others depend on it
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-accent-soft mt-0.5 shrink-0"
                  />
                  Verify often — don&apos;t wait until all files look fixed
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-accent-soft mt-0.5 shrink-0"
                  />
                  Be careful with votes — wrong accusations cost 30 seconds
                </li>
              </ul>
            </div>
            <div className="space-y-4">
              <h4 className="text-sm font-bold text-ghost">For the Ghost</h4>
              <ul className="space-y-3 text-sm text-text-muted leading-relaxed">
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-ghost mt-0.5 shrink-0"
                  />
                  Make small, subtle edits — large edits get flagged
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-ghost mt-0.5 shrink-0"
                  />
                  Use Inject Bug on Stage 1 files to cascade-break everything
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-ghost mt-0.5 shrink-0"
                  />
                  Fake Fix wastes engineers&apos; time without raising much
                  paranoia
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-ghost mt-0.5 shrink-0"
                  />
                  Breadcrumbs blame random engineers — let them fight each other
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-ghost mt-0.5 shrink-0"
                  />
                  Vote &quot;Guilty&quot; on an engineer to cause confusion
                </li>
                <li className="flex items-start gap-2">
                  <ArrowRight
                    size={14}
                    className="text-ghost mt-0.5 shrink-0"
                  />
                  Use taunts and voice to psychologically pressure engineers
                </li>
              </ul>
            </div>
          </div>
        </Section>

        {/* Footer */}
        <div className="text-center pt-10 pb-14 border-t border-border/30">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-8 py-3.5 bg-accent/10 text-accent-soft border border-accent/40 hover:bg-accent/20 hover:border-accent-light text-sm font-medium rounded-lg transition-all"
          >
            <Ghost size={18} />
            Start Playing
          </Link>
        </div>
      </div>
    </div>
  );
}

/* ── Helper Components ─────────────────────────────────── */

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-5">
      <h2 className="text-base font-bold text-text-primary border-b border-border/50 pb-3">
        {title}
      </h2>
      {children}
    </section>
  );
}

function InfoCard({
  icon,
  title,
  description,
  borderClass,
  titleClass,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  borderClass: string;
  titleClass: string;
}) {
  return (
    <div
      className={`border ${borderClass} p-6 rounded-lg text-center space-y-3`}
    >
      <div className="flex justify-center">{icon}</div>
      <h3 className={`text-sm font-bold ${titleClass}`}>{title}</h3>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <div className="flex items-center justify-center w-9 h-9 shrink-0 rounded-lg border border-accent/40 bg-accent/10 text-accent-soft text-sm font-bold">
        {number}
      </div>
      <div className="space-y-1 pt-1">
        <h3 className="text-sm font-bold text-text-primary">{title}</h3>
        <p className="text-sm text-text-muted leading-relaxed">{children}</p>
      </div>
    </li>
  );
}

function StageRow({
  stage,
  time,
  label,
  description,
  color,
  bg,
}: {
  stage: number;
  time: string;
  label: string;
  description: string;
  color: string;
  bg: string;
}) {
  return (
    <div
      className={`flex items-center gap-4 px-5 py-4 rounded-lg border ${bg}`}
    >
      <span className={`text-base font-bold ${color} w-8`}>S{stage}</span>
      <span className="text-xs text-text-subtle w-24">{time}</span>
      <span className={`text-sm font-bold ${color} w-28`}>{label}</span>
      <span className="text-sm text-text-muted flex-1">{description}</span>
    </div>
  );
}

function ParanoiaRow({
  label,
  value,
  valueClass,
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center gap-4 px-5 py-3 rounded-lg border border-border/50 bg-surface">
      <span className="text-text-subtle w-24 text-sm">{label}</span>
      <span className={`text-sm ${valueClass || "text-text-muted"}`}>
        {value}
      </span>
    </div>
  );
}

function AudioRow({
  title,
  titleClass,
  borderClass,
  description,
}: {
  title: string;
  titleClass: string;
  borderClass: string;
  description: string;
}) {
  return (
    <div className={`px-5 py-4 rounded-lg border ${borderClass}`}>
      <span className={`${titleClass} font-bold text-sm`}>{title}</span>
      <span className="text-text-muted text-sm ml-3">— {description}</span>
    </div>
  );
}

function AbilityCard({
  icon,
  name,
  cooldown,
  paranoia,
  description,
}: {
  icon: React.ReactNode;
  name: string;
  cooldown: string;
  paranoia: string;
  description: string;
}) {
  return (
    <div className="border border-ghost/20 bg-ghost/5 p-5 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ghost">
          {icon}
          <span className="text-sm font-bold">{name}</span>
        </div>
        <div className="flex gap-3">
          <span className="text-xs text-text-subtle">{cooldown}</span>
          <span className="text-xs text-ghost">{paranoia}</span>
        </div>
      </div>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}

function ToolCard({
  icon,
  name,
  cooldown,
  description,
}: {
  icon: React.ReactNode;
  name: string;
  cooldown: string;
  description: string;
}) {
  return (
    <div className="border border-accent/20 bg-accent/5 p-5 rounded-lg space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-accent-soft">
          {icon}
          <span className="text-sm font-bold">{name}</span>
        </div>
        <span className="text-xs text-text-subtle">{cooldown}</span>
      </div>
      <p className="text-sm text-text-muted leading-relaxed">{description}</p>
    </div>
  );
}
