/**
 * Builds the api-linter command line and executes the binary.
 *
 * {@link buildArgs} is a pure function (easy to unit-test); {@link runLinter}
 * performs the actual process execution.
 */

import * as exec from "@actions/exec";
import type { ActionInputs, OutputFormat } from "./types.ts";

/** Options that vary between the internal JSON run and a user-requested run. */
export interface RunOptions {
  /** Output format for this invocation. */
  readonly format: OutputFormat;
  /** File to write results to, or "" to write to stdout. */
  readonly outputPath: string;
  /** Resolved proto files to lint (ignored when skipping compilation). */
  readonly files: readonly string[];
}

/** The captured result of executing api-linter. */
export interface RunResult {
  /** Process exit code. */
  readonly exitCode: number;
  /** Captured standard output. */
  readonly stdout: string;
  /** Captured standard error. */
  readonly stderr: string;
}

/**
 * Assemble the api-linter argument vector from inputs and run options.
 *
 * The array is built in a deterministic order so it can be asserted in tests.
 * Positional proto files are omitted when `skip-compilation` is set, because
 * the linter then sources files from the provided descriptor set.
 *
 * @param inputs - The parsed action inputs.
 * @param options - Per-invocation format, output path and file list.
 * @returns The ordered argument vector (excluding the binary itself).
 */
export function buildArgs(inputs: ActionInputs, options: RunOptions): string[] {
  const args: string[] = [];

  if (inputs.config) {
    args.push("--config", inputs.config);
  }
  for (const dir of inputs.protoPaths) {
    args.push("-I", dir);
  }
  for (const rule of inputs.enableRules) {
    args.push("--enable-rule", rule);
  }
  for (const rule of inputs.disableRules) {
    args.push("--disable-rule", rule);
  }
  if (inputs.ignoreCommentDisables) {
    args.push("--ignore-comment-disables");
  }
  for (const descriptor of inputs.descriptorSetIn) {
    args.push("--descriptor-set-in", descriptor);
  }
  if (inputs.skipCompilation) {
    args.push("--skip-compilation");
  }

  args.push("--output-format", options.format);
  if (options.outputPath) {
    args.push("-o", options.outputPath);
  }

  if (!inputs.skipCompilation) {
    args.push(...options.files);
  }

  return args;
}

/**
 * Execute api-linter and capture its output.
 *
 * The return code is never treated as a failure here: api-linter uses a
 * non-zero exit for "problems found", which the caller interprets alongside
 * the parsed report.
 *
 * @param binary - Absolute path to the api-linter executable.
 * @param args - The argument vector from {@link buildArgs}.
 * @param cwd - Working directory to run the linter in.
 * @returns The captured exit code, stdout and stderr.
 */
export async function runLinter(
  binary: string,
  args: readonly string[],
  cwd: string,
): Promise<RunResult> {
  const output = await exec.getExecOutput(binary, [...args], {
    cwd,
    ignoreReturnCode: true,
    silent: true,
  });
  return {
    exitCode: output.exitCode,
    stdout: output.stdout,
    stderr: output.stderr,
  };
}
