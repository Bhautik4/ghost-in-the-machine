# Implementation Plan: Interconnected System Tasks

## Overview

Replace the current 8-task independent bug-fix system with a 3-file interconnected scenario model. Implementation proceeds bottom-up: core data types and interfaces first, then the scenario generation and validation modules, then Liveblocks storage updates, then UI component modifications, and finally wiring everything together with the API route and lobby integration.

## Tasks

- [x] 1. Define core types and interfaces
  - [x] 1.1 Create Scenario, ScenarioFile, TestCase, DependencyGraph, and ChainValidationResult interfaces in a new `src/types/scenario.ts` file
    - Include `Scenario`, `ScenarioFile`, `TestCase` (with optional `crossFile` flag), `DependencyGraph`, `FileStatus`, `SystemStatus`, and `ChainValidationResult` types
    - Export all types for use across the codebase
    - _Requirements: 1.2, 1.3, 4.5, 7.2_

- [x] 2. Implement StaticScenarioBank
  - [x] 2.1 Create `src/lib/staticScenarioBank.ts` with at least 2 pre-authored interconnected scenarios
    - Each scenario must have a narrative description, 3 files forming a dependency chain (stage 1 → 2 → 3), a valid DAG dependency graph, and at least 2 test cases per file
    - Include `getStaticScenario(roomCode: string): Scenario` that deterministically selects a scenario based on room code
    - Ensure buggyCode/fixedCode are distinct per file, files are 10–30 lines of TypeScript/JavaScript with no imports
    - _Requirements: 2.1, 2.2, 2.3, 7.3_

  - [ ]\* 2.2 Write property test for static scenario determinism
    - **Property 4: Static scenario selection is deterministic**
    - **Validates: Requirements 2.2**

  - [ ]\* 2.3 Write unit tests for StaticScenarioBank
    - Test that at least 2 scenarios exist
    - Test that all static scenarios conform to the Scenario schema (3 files, valid DAG, test cases per file)
    - Test that fixedCode passes tests and buggyCode fails tests for each file
    - _Requirements: 2.1, 2.3_

- [x] 3. Implement ChainValidator
  - [x] 3.1 Create `src/lib/chainValidator.ts` with `validateChain` and `getInvalidationCascade` functions
    - `validateChain` runs tests in dependency order using existing `runTests` from `testRunner.ts`
    - Files with unverified dependencies get status "blocked" (tests not executed)
    - Returns per-file results and system-wide status ("operational" only when all 3 pass)
    - `getInvalidationCascade` returns the edited file's ID plus all transitive dependents
    - _Requirements: 4.1, 4.2, 4.3, 4.5, 4.6_

  - [ ]\* 3.2 Write property test for dependency-order execution
    - **Property 5: Chain validation executes in dependency order**
    - **Validates: Requirements 4.1**

  - [ ]\* 3.3 Write property test for dependency blocking
    - **Property 6: Unverified dependencies block dependent files**
    - **Validates: Requirements 4.2**

  - [ ]\* 3.4 Write property test for cascading invalidation
    - **Property 7: Editing a file cascades invalidation to all dependents**
    - **Validates: Requirements 4.6, 6.1**

- [x] 4. Checkpoint — Ensure core modules compile and tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement ScenarioGenerator
  - [x] 5.1 Create `src/lib/scenarioGenerator.ts` with single-prompt LLM scenario generation
    - Build a prompt requesting a cohesive 3-file system scenario with narrative, dependency graph, bugs, fixes, and test cases
    - Use Gemini 3 Flash Preview via `@google/genai` (same pattern as current `taskGenerator.ts`)
    - Parse and validate the LLM response: exactly 3 files, distinct buggyCode/fixedCode, at least 2 test cases per file, valid DAG, 10–30 lines per file
    - Verify fixedCode passes tests and buggyCode fails at least one test per file
    - Retry up to 2 times on failure, then return `null` to signal fallback
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6, 1.7, 7.1, 7.2, 7.3, 7.4, 7.5_

  - [ ]\* 5.2 Write property test for scenario validation
    - **Property 1: Scenario validation rejects invalid structures**
    - **Validates: Requirements 1.3, 7.2**

  - [ ]\* 5.3 Write property test for stage-dependency consistency
    - **Property 2: Stage values are consistent with dependency depth**
    - **Validates: Requirements 1.2**

  - [ ]\* 5.4 Write property test for test validation
    - **Property 3: Test validation distinguishes fixed from buggy code**
    - **Validates: Requirements 1.4**

  - [ ]\* 5.5 Write property test for file line count bounds
    - **Property 9: Scenario files are within line count bounds**
    - **Validates: Requirements 7.3**

- [x] 6. Create API route and useGameScenario hook
  - [x] 6.1 Create `src/app/api/generate-scenario/route.ts`
    - POST endpoint accepting `{ roomCode }`, calls `generateScenario`, falls back to `getStaticScenario` on failure or missing API key
    - Returns `{ scenario, generated, reason? }`
    - _Requirements: 1.1, 1.6, 1.7_

  - [x] 6.2 Create `src/lib/useGameScenario.ts` hook replacing `useGameTasks.ts`
    - Read `generatedScenario` from Liveblocks storage, fall back to static scenario
    - Expose `scenario`, `files`, `dependencyGraph`, `isGenerated`, `scenarioLabel`, `getUnlockedFiles`, `getCurrentStage`
    - _Requirements: 3.1, 5.4_

  - [ ]\* 6.3 Write property test for stage unlock monotonicity
    - **Property 8: Stage unlock is monotonic with elapsed time**
    - **Validates: Requirements 5.4**

- [x] 7. Update Liveblocks storage schema and Room initialization
  - [x] 7.1 Update `liveblocks.config.ts` to add `generatedScenario`, `fileVerification`, and `systemStatus` fields; keep old fields for backward compatibility during transition
    - `generatedScenario: Scenario | null`
    - `fileVerification: Record<string, { verified: boolean; status: FileStatus }>`
    - `systemStatus: "operational" | "degraded"`
    - _Requirements: 3.1, 3.4_

  - [x] 7.2 Update `src/components/Multiplayer/Room.tsx` initial storage to include new fields
    - Add `generatedScenario: null`, `fileVerification: {}`, `systemStatus: "degraded"` to `initialStorage`
    - _Requirements: 3.1_

- [x] 8. Checkpoint — Ensure storage schema, API route, and hook compile correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 9. Update Lobby to use new scenario generation
  - [x] 9.1 Modify `src/components/Editor/Lobby.tsx` to call `/api/generate-scenario` and store result in `generatedScenario` Liveblocks field
    - Replace the `storeGeneratedTasks` mutation with `storeGeneratedScenario` that writes to `generatedScenario`
    - Update `handleStartGame` to call the new API endpoint
    - _Requirements: 1.1, 3.1_

- [x] 10. Update GameEditor for interconnected file navigation and chain validation
  - [x] 10.1 Modify `src/components/Editor/GameEditor.tsx` to use `useGameScenario` hook instead of `useGameTasks`
    - Display 3 scenario files in sidebar with dependency indicators and per-file verification status (passed/failed/blocked)
    - Replace per-task "Verify Fix" with a "Verify System" button that triggers `validateChain`
    - Update win condition check to use chain validation result (all 3 files pass → engineers-win)
    - Show file dependency relationships in the sidebar (e.g., arrows or labels showing "depends on File A")
    - On edit of a verified file, call `getInvalidationCascade` and clear verification for affected files
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 5.2, 5.3, 5.5_

- [x] 11. Update EditorWorkspace with scenario banner and system status
  - [x] 11.1 Modify `src/components/Editor/EditorWorkspace.tsx` to display scenario narrative banner and system status indicator
    - Show scenario description in a prominent banner visible during gameplay
    - Add a System Status indicator showing verified file count and operational/degraded state
    - Visually indicate when a new stage unlocks
    - _Requirements: 5.1, 5.5, 5.6_

- [x] 12. Update GhostControls for cascading sabotage
  - [x] 12.1 Modify `src/components/Editor/GhostControls.tsx` to use `useGameScenario` and cascade invalidation on Inject Bug
    - Inject Bug: revert file to buggyCode + invalidate that file AND all dependents via `getInvalidationCascade`
    - Fake Fix: make file appear verified for 15s in `fileVerification` (ghost sees true status)
    - Blackout and Phantom Cursor: unchanged behavior
    - Breadcrumb firing: unchanged behavior
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 13. Update GameOverlay to reset new storage fields
  - [x] 13.1 Modify `src/components/Editor/GameOverlay.tsx` `resetLiveblocks` mutation to clear `generatedScenario`, `fileVerification`, and `systemStatus` alongside existing fields
    - _Requirements: 3.1_

- [x] 14. Checkpoint — Ensure all components compile and integrate correctly
  - Ensure all tests pass, ask the user if questions arise.

- [x] 15. Wire everything together and final integration
  - [x] 15.1 Verify end-to-end flow: Lobby generates scenario → stores in Liveblocks → GameEditor reads scenario → engineers edit files → Verify System runs chain validation → all pass triggers engineers-win
    - Ensure ghost sabotage cascades correctly through the dependency chain
    - Ensure static fallback works when no API key is set
    - Ensure timer expiry with incomplete verification triggers ghost-wins
    - _Requirements: 1.6, 1.7, 4.4, 8.1, 8.2, 8.3_

  - [ ]\* 15.2 Write integration tests for end-to-end scenario flow
    - Test LLM API call with mocked Gemini returns valid scenario
    - Test retry logic: 2 retries then fallback on LLM failure
    - Test all-files-pass → engineers-win condition
    - Test timer-expires → ghost-wins condition
    - _Requirements: 4.4, 8.1, 8.2_

- [x] 16. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate the 9 correctness properties from the design document
- The existing `taskGenerator.ts`, `taskBank.ts`, `useGameTasks.ts`, and `/api/generate-tasks` route remain untouched until the new system is fully wired — components switch over in task 9–12
- Cross-file test cases prepend dependency files' code before running assertions, using the existing `runTests` function from `testRunner.ts`
