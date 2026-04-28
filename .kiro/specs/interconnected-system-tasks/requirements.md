# Requirements Document

## Introduction

Replace the current system of 8 independent bug-fix tasks with an interconnected broken system scenario. Instead of fixing isolated bugs, engineers face a cohesive 3-file system where files depend on each other, bugs cascade across the dependency chain, and fix order matters. The LLM generates the entire scenario (description, files, bugs, fixes, dependencies, test cases) with static fallback scenarios for reliability. This transforms gameplay from pattern-matching into collaborative system diagnosis, making engineer coordination essential and ghost sabotage strategically impactful.

## Glossary

- **Scenario**: A cohesive narrative describing a broken system (e.g., "The authentication server is down") along with its 3 interconnected files, bugs, fixes, dependency graph, and test cases.
- **Scenario_Generator**: The server-side module that uses Gemini 3 Flash Preview to generate a complete interconnected Scenario for a game session.
- **Scenario_File**: One of the 3 code files within a Scenario, containing one or more bugs that may depend on fixes in other Scenario_Files.
- **Dependency_Graph**: A directed acyclic graph defining which Scenario_Files must be fixed before others can pass validation. Encoded as an adjacency list mapping each file ID to the file IDs it depends on.
- **Chain_Validator**: The client-side module that validates the entire interconnected system by running test cases in dependency order, reporting per-file and system-wide pass/fail status.
- **System_Status**: An aggregate health indicator derived from Chain_Validator results, showing how many Scenario_Files pass validation and whether the full system is operational.
- **Static_Scenario_Bank**: A curated set of pre-authored Scenarios used as fallback when LLM generation fails or the API key is unavailable.
- **Editor_Workspace**: The main game UI where engineers view and edit Scenario_Files, see System_Status, and interact with the code editor.
- **Ghost_Controls**: The panel providing the ghost player with sabotage abilities (Inject Bug, Fake Fix, Blackout, Phantom Cursor).
- **Liveblocks_Storage**: The shared real-time storage layer (Liveblocks) that synchronizes game state, editor content, and scenario data across all players in a room.

## Requirements

### Requirement 1: LLM Scenario Generation

**User Story:** As a game host, I want the system to generate a unique interconnected broken system scenario when a game starts, so that each session feels fresh and engineers face a realistic collaborative debugging challenge.

#### Acceptance Criteria

1. WHEN the host starts a game, THE Scenario_Generator SHALL send a single prompt to Gemini 3 Flash Preview requesting a complete Scenario containing a narrative description, exactly 3 Scenario_Files with bugs, their fixed versions, a Dependency_Graph, and test cases for each file.
2. THE Scenario_Generator SHALL assign each Scenario_File a stage value (1, 2, or 3) corresponding to its position in the dependency chain, where stage 1 is the foundational file with no dependencies, stage 2 depends on stage 1, and stage 3 depends on stage 2.
3. WHEN the LLM returns a response, THE Scenario_Generator SHALL validate that the response contains exactly 3 files, each file has distinct buggyCode and fixedCode, every file has at least 2 test cases, and the Dependency_Graph forms a valid directed acyclic graph with no cycles.
4. WHEN validation succeeds, THE Scenario_Generator SHALL verify each file's fixedCode passes its own test cases and each file's buggyCode fails at least one of its own test cases.
5. THE Scenario_Generator SHALL include a scenario-level narrative description (e.g., "The authentication server is down. 3 services are failing.") that is displayed to all players at game start.
6. IF the LLM response fails validation or the API call fails after 2 retry attempts, THEN THE Scenario_Generator SHALL fall back to a randomly selected Scenario from the Static_Scenario_Bank.
7. IF the GEMINI_API_KEY environment variable is not configured, THEN THE Scenario_Generator SHALL use a Scenario from the Static_Scenario_Bank without attempting LLM generation.

### Requirement 2: Static Scenario Fallback Bank

**User Story:** As a player, I want the game to always have working scenarios available even when LLM generation fails, so that gameplay is never blocked by API issues.

#### Acceptance Criteria

1. THE Static_Scenario_Bank SHALL contain at least 2 pre-authored Scenarios, each with a narrative description, 3 Scenario_Files, a Dependency_Graph, and test cases per file.
2. THE Static_Scenario_Bank SHALL select a Scenario deterministically based on the room code, so that the same room code produces the same fallback Scenario.
3. WHEN a static Scenario is selected, THE Static_Scenario_Bank SHALL provide data in the same format as LLM-generated Scenarios, requiring no special handling by downstream components.

### Requirement 3: Scenario Data Storage and Synchronization

**User Story:** As a player, I want the generated scenario to be shared in real-time with all players in the room, so that everyone sees the same files and system state.

#### Acceptance Criteria

1. WHEN a Scenario is generated or selected from fallback, THE Liveblocks_Storage SHALL store the complete Scenario data including the narrative description, all 3 Scenario_Files (id, fileName, label, description, buggyCode, fixedCode, stage, testCases), and the Dependency_Graph.
2. THE Liveblocks_Storage SHALL store editor content keyed by Scenario_File ID, so that each file's code is independently editable and synchronized across all players.
3. WHEN a player edits a Scenario_File, THE Liveblocks_Storage SHALL propagate the change to all connected players within the existing Liveblocks real-time sync mechanism.
4. THE Liveblocks_Storage SHALL store per-file verification status (verified or not) and system-wide verification status, accessible to all players.

### Requirement 4: Dependency-Aware Chain Validation

**User Story:** As an engineer, I want to verify my fixes against the whole system so that I know whether my changes actually bring the system back online, not just fix one file in isolation.

#### Acceptance Criteria

1. WHEN an engineer clicks "Verify System", THE Chain_Validator SHALL run test cases for each Scenario_File in dependency order (stage 1 first, then stage 2, then stage 3).
2. IF a Scenario_File's dependencies have not passed validation, THEN THE Chain_Validator SHALL skip that file's tests and report it as "blocked" with a message indicating which dependency failed.
3. WHEN all test cases for a Scenario_File pass, THE Chain_Validator SHALL mark that file as verified in Liveblocks_Storage.
4. WHEN all 3 Scenario_Files pass validation, THE Chain_Validator SHALL set the game status to "engineers-win" in Liveblocks_Storage.
5. THE Chain_Validator SHALL return a per-file result (passed, failed, or blocked) and a system-wide result (operational or degraded) for display in the UI.
6. WHEN a verified Scenario_File's editor content changes, THE Chain_Validator SHALL invalidate that file's verification status and the verification status of all files that depend on it.

### Requirement 5: Editor Workspace with Interconnected File Navigation

**User Story:** As an engineer, I want to see all 3 system files, understand their dependencies, and navigate between them, so that I can diagnose the broken system holistically.

#### Acceptance Criteria

1. THE Editor_Workspace SHALL display the scenario narrative description in a prominent banner or panel visible to all players during gameplay.
2. THE Editor_Workspace SHALL display all 3 Scenario_Files in the task sidebar, showing each file's name, stage number, dependency relationships, and current verification status (verified, failed, or blocked).
3. WHEN an engineer selects a Scenario_File from the sidebar, THE Editor_Workspace SHALL load that file's current content into the code editor with full editing capability.
4. WHILE a Scenario_File's stage has not been unlocked based on elapsed game time (Stage 1: 0:00–1:30, Stage 2: 1:30–3:00, Stage 3: 3:00–4:00), THE Editor_Workspace SHALL display that file as locked and read-only.
5. THE Editor_Workspace SHALL display a System_Status indicator showing how many files are verified and whether the full system is operational.
6. WHEN a new stage unlocks during gameplay, THE Editor_Workspace SHALL visually indicate the newly available file to all players.

### Requirement 6: Ghost Sabotage Abilities Adapted for Interconnected System

**User Story:** As the ghost, I want my sabotage abilities to work within the interconnected system so that I can strategically disrupt the dependency chain and cause cascading failures.

#### Acceptance Criteria

1. WHEN the ghost uses "Inject Bug" on a verified Scenario_File, THE Ghost_Controls SHALL revert that file's editor content to its buggyCode, invalidate its verification status, and invalidate the verification status of all dependent files in the chain.
2. WHEN the ghost uses "Fake Fix" on an unverified Scenario_File, THE Ghost_Controls SHALL make that file appear verified to engineers for 15 seconds without actually changing the code, while the ghost sees the true status.
3. WHEN the ghost uses "Blackout", THE Ghost_Controls SHALL broadcast a 5-second dark screen event to all engineers, functioning identically to the current implementation.
4. WHEN the ghost uses "Phantom Cursor", THE Ghost_Controls SHALL spawn a fake cursor using a random real player's name and color, functioning identically to the current implementation.
5. THE Ghost_Controls SHALL fire a false breadcrumb blame message on each ability use, selecting from ability-specific message templates and blaming a random engineer.

### Requirement 7: Scenario Generation Prompt and Response Schema

**User Story:** As a developer, I want a well-defined prompt and response schema for LLM scenario generation, so that generated scenarios are consistently structured and validatable.

#### Acceptance Criteria

1. THE Scenario_Generator SHALL send a prompt that instructs the LLM to generate a cohesive system scenario with a narrative description, exactly 3 TypeScript/JavaScript files that form a dependency chain, bugs in each file that are related to the system's interconnected nature, and test cases that validate both individual file correctness and cross-file dependencies.
2. THE Scenario_Generator SHALL require the LLM response to conform to a JSON schema containing: a scenario description string, an array of exactly 3 file objects (each with id, fileName, label, description, buggyCode, fixedCode, stage, and testCases), and a dependencyGraph object mapping file IDs to arrays of dependency file IDs.
3. THE Scenario_Generator SHALL instruct the LLM to generate files where each file is 10–30 lines of TypeScript/JavaScript with no external imports or dependencies.
4. THE Scenario_Generator SHALL instruct the LLM to generate test case assertions as self-contained JavaScript expressions that return true when the code is correct, with cross-file test cases that validate the dependency chain by executing functions from multiple files together.
5. IF the LLM response does not conform to the required JSON schema, THEN THE Scenario_Generator SHALL reject the response and retry or fall back to static scenarios.

### Requirement 8: Win and Loss Condition Integration

**User Story:** As a player, I want the win/loss conditions to reflect the interconnected system, so that the game ends correctly based on whether the full system is brought back online.

#### Acceptance Criteria

1. WHEN all 3 Scenario_Files pass chain validation, THE Liveblocks_Storage SHALL set gameStatus to "engineers-win".
2. WHEN the 4-minute game timer expires and at least one Scenario_File has not passed validation, THE Liveblocks_Storage SHALL set gameStatus to "ghost-wins".
3. WHEN the paranoia meter reaches 100, THE Liveblocks_Storage SHALL set gameStatus to "ghost-wins", functioning identically to the current implementation.
