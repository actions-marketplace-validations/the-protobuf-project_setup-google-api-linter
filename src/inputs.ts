/**
 * Reads and validates the action's inputs into a typed {@link ActionInputs}.
 *
 * All parsing lives here so the rest of the code works with clean, typed
 * values rather than raw `core.getInput` strings.
 */

import * as core from "@actions/core";
import type { ActionInputs, OutputFormat } from "./types.ts";

/** Output formats accepted for the written report file. */
const OUTPUT_FORMATS: readonly OutputFormat[] = ["json", "yaml", "github", "summary"];

/**
 * Split a multiline/comma-separated input into a trimmed, non-empty list.
 *
 * Accepts both newline-separated values (the idiomatic Actions style) and
 * comma-separated values, so either style in a workflow file works.
 *
 * @param name - The action input name to read.
 * @returns The parsed list of values, or an empty array when unset.
 */
function getList(name: string): string[] {
  return core
    .getInput(name)
    .split(/[\n,]/)
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
}

/**
 * Validate that a raw string is a supported {@link OutputFormat}.
 *
 * @param value - The raw `output-format` input.
 * @returns The validated format.
 * @throws If the value is not one of the supported formats.
 */
function parseOutputFormat(value: string): OutputFormat {
  const normalized = value.trim().toLowerCase();
  if (!OUTPUT_FORMATS.includes(normalized as OutputFormat)) {
    throw new Error(
      `Invalid output-format "${value}". Expected one of: ${OUTPUT_FORMATS.join(", ")}.`,
    );
  }
  return normalized as OutputFormat;
}

/**
 * Read every action input and assemble a validated {@link ActionInputs}.
 *
 * @returns The fully parsed and validated inputs.
 * @throws If any input fails validation (e.g. a bad `output-format`).
 */
export function getInputs(): ActionInputs {
  const paths = getList("paths");
  const skipCompilation = core.getBooleanInput("skip-compilation");
  const descriptorSetIn = getList("descriptor-set-in");

  if (skipCompilation && descriptorSetIn.length === 0) {
    throw new Error("skip-compilation is true but no descriptor-set-in files were provided.");
  }

  return {
    version: core.getInput("version").trim() || "latest",
    paths: paths.length > 0 ? paths : ["**/*.proto"],
    config: core.getInput("config").trim(),
    protoPaths: getList("proto-paths"),
    enableRules: getList("enable-rules"),
    disableRules: getList("disable-rules"),
    ignoreCommentDisables: core.getBooleanInput("ignore-comment-disables"),
    descriptorSetIn,
    skipCompilation,
    buf: core.getBooleanInput("buf"),
    bufInput: core.getInput("buf-input").trim() || ".",
    bufVersion: core.getInput("buf-version").trim() || "latest",
    outputFormat: parseOutputFormat(core.getInput("output-format") || "json"),
    outputPath: core.getInput("output-path").trim(),
    annotate: core.getBooleanInput("annotate"),
    jobSummary: core.getBooleanInput("job-summary"),
    failOnError: core.getBooleanInput("fail-on-error"),
    workingDirectory: core.getInput("working-directory").trim() || ".",
    githubToken: core.getInput("github-token"),
  };
}
