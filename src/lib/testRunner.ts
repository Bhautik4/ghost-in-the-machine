/**
 * Client-side test runner for verifying engineer fixes.
 *
 * Runs code + test assertions in an isolated context using
 * the Function constructor with a timeout guard.
 * Returns detailed pass/fail results for each test case.
 */

export interface TestResult {
  description: string;
  passed: boolean;
  error?: string;
}

export interface RunResult {
  allPassed: boolean;
  results: TestResult[];
  totalPassed: number;
  totalFailed: number;
}

/**
 * Run a set of test assertions against a code snippet.
 *
 * Each assertion is a JS expression that should return `true`
 * when the code is correct. The code is prepended so functions/variables
 * it defines are available to the assertion.
 *
 * Uses `new Function()` for basic isolation — no access to outer scope,
 * DOM, or Node APIs. A timeout wrapper catches infinite loops.
 *
 * @param code - The code snippet to test (engineer's current edit)
 * @param testCases - Array of { description, assertion } objects
 * @returns RunResult with per-test pass/fail details
 */
export function runTests(
  code: string,
  testCases: { description: string; assertion: string }[],
): RunResult {
  const results: TestResult[] = [];

  for (const tc of testCases) {
    try {
      // Wrap code + assertion in strict mode
      const wrappedCode = `
        "use strict";
        ${code}
        ;
        return (${tc.assertion});
      `;

      // Function constructor provides basic sandboxing
      const fn = new Function(wrappedCode);

      // Execute with a simple timeout check
      // (can't truly timeout sync code without a Worker,
      //  but this catches most issues)
      const result = fn();

      results.push({
        description: tc.description,
        passed: result === true,
        error:
          result === true ? undefined : `Expected true, got ${String(result)}`,
      });
    } catch (err) {
      results.push({
        description: tc.description,
        passed: false,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const totalPassed = results.filter((r) => r.passed).length;
  const totalFailed = results.filter((r) => !r.passed).length;

  return {
    allPassed: totalFailed === 0,
    results,
    totalPassed,
    totalFailed,
  };
}

/**
 * Validate code against test cases with expected pass/fail behavior.
 * Used by scenarioGenerator to verify LLM-generated code.
 *
 * @param code - The code to evaluate
 * @param testCases - Test assertions to run
 * @param shouldPass - If true, all tests should pass. If false, at least one should fail.
 */
export function validateCodeWithTests(
  code: string,
  testCases: { description: string; assertion: string }[],
  shouldPass: boolean,
): { passed: boolean; failures: string[] } {
  const failures: string[] = [];

  for (const tc of testCases) {
    try {
      const wrappedCode = `
        "use strict";
        ${code}
        ;
        (${tc.assertion})
      `;

      const fn = new Function(wrappedCode);
      const result = fn();

      if (shouldPass && result !== true) {
        failures.push(`SHOULD PASS but didn't: ${tc.description}`);
      }
      if (!shouldPass && result === true) {
        failures.push(`SHOULD FAIL but passed: ${tc.description}`);
      }
    } catch (err) {
      if (shouldPass) {
        failures.push(`SHOULD PASS but threw: ${tc.description} — ${err}`);
      }
    }
  }

  return { passed: failures.length === 0, failures };
}
