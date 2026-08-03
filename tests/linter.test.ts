/** Unit tests for the pure api-linter argument builder. */

import { describe, expect, test } from "bun:test";
import { buildArgs } from "../src/linter.ts";
import type { ActionInputs } from "../src/types.ts";

/** Build an {@link ActionInputs} with sensible defaults, overriding as needed. */
function makeInputs(overrides: Partial<ActionInputs> = {}): ActionInputs {
  return {
    version: "latest",
    paths: ["**/*.proto"],
    config: "",
    protoPaths: [],
    enableRules: [],
    disableRules: [],
    ignoreCommentDisables: false,
    descriptorSetIn: [],
    skipCompilation: false,
    outputFormat: "json",
    outputPath: "",
    annotate: true,
    jobSummary: true,
    failOnError: true,
    workingDirectory: ".",
    githubToken: "",
    ...overrides,
  };
}

describe("buildArgs", () => {
  test("emits format, output path and positional files by default", () => {
    const args = buildArgs(makeInputs(), {
      format: "json",
      outputPath: "/tmp/out.json",
      files: ["a.proto", "b.proto"],
    });
    expect(args).toEqual(["--output-format", "json", "-o", "/tmp/out.json", "a.proto", "b.proto"]);
  });

  test("includes config, import paths and rule toggles in order", () => {
    const args = buildArgs(
      makeInputs({
        config: "api-linter.yaml",
        protoPaths: ["proto", "third_party"],
        enableRules: ["core::0131"],
        disableRules: ["core::0192::has-comments"],
        ignoreCommentDisables: true,
      }),
      { format: "json", outputPath: "", files: ["a.proto"] },
    );
    expect(args).toEqual([
      "--config",
      "api-linter.yaml",
      "-I",
      "proto",
      "-I",
      "third_party",
      "--enable-rule",
      "core::0131",
      "--disable-rule",
      "core::0192::has-comments",
      "--ignore-comment-disables",
      "--output-format",
      "json",
      "a.proto",
    ]);
  });

  test("omits positional files and adds descriptor flags when skipping compilation", () => {
    const args = buildArgs(
      makeInputs({
        skipCompilation: true,
        descriptorSetIn: ["set.pb"],
      }),
      { format: "yaml", outputPath: "report.yaml", files: ["ignored.proto"] },
    );
    expect(args).toEqual([
      "--descriptor-set-in",
      "set.pb",
      "--skip-compilation",
      "--output-format",
      "yaml",
      "-o",
      "report.yaml",
    ]);
    expect(args).not.toContain("ignored.proto");
  });
});
