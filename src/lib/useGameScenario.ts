"use client";

import { useStorage } from "@liveblocks/react/suspense";
import { useMemo } from "react";
import { getStaticScenario } from "@/lib/staticScenarioBank";
import type { Scenario, ScenarioFile, DependencyGraph } from "@/types/scenario";

/** Total game duration in seconds */
export const GAME_DURATION = 240;

/** Stage unlock timing: Stage 1 at 0s, Stage 2 at 90s, Stage 3 at 180s */
export function getUnlockedFiles(
  files: ScenarioFile[],
  elapsedSeconds: number,
): ScenarioFile[] {
  if (elapsedSeconds >= 180) return files;
  if (elapsedSeconds >= 90) return files.filter((f) => f.stage <= 2);
  return files.filter((f) => f.stage === 1);
}

export function getCurrentStage(elapsedSeconds: number): 1 | 2 | 3 {
  if (elapsedSeconds >= 180) return 3;
  if (elapsedSeconds >= 90) return 2;
  return 1;
}

/**
 * Hook that returns the current game's scenario.
 *
 * Reads from Liveblocks `generatedScenario` storage first.
 * Falls back to static scenario from staticScenarioBank if none exists.
 *
 * This is the SINGLE SOURCE OF TRUTH for scenario data across all components.
 */
export function useGameScenario(roomCode: string) {
  const generatedScenario = useStorage((root) => root.generatedScenario);

  const scenario: Scenario = useMemo(() => {
    if (generatedScenario) {
      return {
        description: generatedScenario.description,
        files: generatedScenario.files.map((f) => ({
          id: f.id,
          fileName: f.fileName,
          label: f.label,
          description: f.description,
          buggyCode: f.buggyCode,
          fixedCode: f.fixedCode,
          stage: f.stage as 1 | 2 | 3,
          testCases: f.testCases.map((tc) => ({
            description: tc.description,
            assertion: tc.assertion,
            crossFile: tc.crossFile || undefined,
          })),
        })),
        dependencyGraph: generatedScenario.dependencyGraph as DependencyGraph,
      };
    }
    return getStaticScenario(roomCode);
  }, [generatedScenario, roomCode]);

  const isGenerated = !!generatedScenario;

  const scenarioLabel = useMemo(() => {
    if (isGenerated) return "AI-Generated Scenario";
    return "Static Scenario";
  }, [isGenerated]);

  return {
    scenario,
    files: scenario.files,
    dependencyGraph: scenario.dependencyGraph,
    isGenerated,
    scenarioLabel,
    getUnlockedFiles: (elapsed: number) =>
      getUnlockedFiles(scenario.files, elapsed),
    getCurrentStage: (elapsed: number) => getCurrentStage(elapsed),
    GAME_DURATION,
  };
}
