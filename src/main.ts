/**
 * Entry point for the Setup Google API Linter action.
 *
 * Orchestrates the run: parse inputs, install the linter, lint the resolved
 * proto files, then surface results as annotations, a job summary, action
 * outputs and (optionally) a report file.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as core from "@actions/core";
import { copyReport, ensureParentDir, resolveProtoFiles } from "./files.ts";
import { getInputs } from "./inputs.ts";
import { installApiLinter } from "./installer.ts";
import { buildArgs, runLinter } from "./linter.ts";
import { annotate, countProblems, parseReport, writeSummary } from "./report.ts";
import type { ActionInputs, LintReport } from "./types.ts";
import { resolveVersion } from "./version.ts";

/**
 * Run the linter once, capturing structured JSON into a temp file, and parse
 * it into a {@link LintReport}.
 *
 * @param binary - Path to the api-linter executable.
 * @param inputs - Parsed action inputs.
 * @param files - Resolved proto files to lint.
 * @returns The temp JSON file path and the parsed report.
 * @throws If the linter fails without producing parseable JSON.
 */
async function lintToJson(
  binary: string,
  inputs: ActionInputs,
  files: readonly string[],
): Promise<{ jsonPath: string; report: LintReport }> {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "api-linter-"));
  const jsonPath = path.join(tempDir, "report.json");
  const args = buildArgs(inputs, { format: "json", outputPath: jsonPath, files });
  const result = await runLinter(binary, args, inputs.workingDirectory);

  const raw = fs.existsSync(jsonPath) ? fs.readFileSync(jsonPath, "utf8") : result.stdout;
  try {
    return { jsonPath, report: parseReport(raw) };
  } catch (error) {
    const detail = result.stderr.trim() || (error as Error).message;
    throw new Error(`api-linter failed (exit ${result.exitCode}): ${detail}`);
  }
}

/**
 * Produce the user-requested report file, if `output-path` was provided.
 *
 * Reuses the JSON already captured when the requested format is JSON; otherwise
 * runs the linter a second time in the requested format.
 *
 * @param binary - Path to the api-linter executable.
 * @param inputs - Parsed action inputs.
 * @param files - Resolved proto files to lint.
 * @param jsonPath - Temp file holding the captured JSON report.
 * @returns The absolute report path, or "" when no output was requested.
 */
async function writeReportFile(
  binary: string,
  inputs: ActionInputs,
  files: readonly string[],
  jsonPath: string,
): Promise<string> {
  if (!inputs.outputPath) {
    return "";
  }
  if (inputs.outputFormat === "json") {
    return copyReport(jsonPath, inputs.outputPath);
  }

  const target = path.resolve(inputs.outputPath);
  ensureParentDir(target);
  const args = buildArgs(inputs, {
    format: inputs.outputFormat,
    outputPath: target,
    files,
  });
  await runLinter(binary, args, inputs.workingDirectory);
  core.info(`Wrote ${inputs.outputFormat} report to ${target}`);
  return target;
}

/** Execute the action end-to-end, translating failures into `setFailed`. */
async function run(): Promise<void> {
  const inputs = getInputs();

  const version = await resolveVersion(inputs.version, inputs.githubToken);
  const binary = await installApiLinter(version);
  core.setOutput("version", version);

  const files = inputs.skipCompilation
    ? []
    : await resolveProtoFiles(inputs.paths, inputs.workingDirectory);

  if (!inputs.skipCompilation && files.length === 0) {
    core.warning(`No proto files matched: ${inputs.paths.join(", ")}`);
    core.setOutput("problem-count", "0");
    core.setOutput("results-path", "");
    return;
  }
  core.info(`Linting ${files.length} proto file(s) with api-linter v${version}.`);

  const { jsonPath, report } = await lintToJson(binary, inputs, files);
  const total = countProblems(report);

  if (inputs.annotate) {
    annotate(report, inputs.workingDirectory);
  }
  if (inputs.jobSummary) {
    await writeSummary(report, version);
  }

  const resultsPath = await writeReportFile(binary, inputs, files, jsonPath);
  core.setOutput("problem-count", String(total));
  core.setOutput("results-path", resultsPath);

  if (total > 0) {
    const message = `api-linter reported ${total} problem(s).`;
    if (inputs.failOnError) {
      core.setFailed(message);
    } else {
      core.warning(message);
    }
    return;
  }
  core.info("api-linter reported no problems. ✅");
}

run().catch((error: unknown) => {
  core.setFailed(error instanceof Error ? error.message : String(error));
});
