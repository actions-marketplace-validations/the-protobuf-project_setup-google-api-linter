/**
 * Shared TypeScript types for the Setup Google API Linter action.
 *
 * The report interfaces mirror the JSON emitted by `api-linter
 * --output-format json`; see https://linter.aip.dev/ for the tool itself.
 */

/** Report file formats understood by api-linter's `--output-format` flag. */
export type OutputFormat = "json" | "yaml" | "github" | "summary";

/** A one-based line/column coordinate within a proto source file. */
export interface Position {
  /** One-based line number. */
  readonly line_number: number;
  /** One-based column number. */
  readonly column_number: number;
}

/** The source span a problem points at, plus the file it belongs to. */
export interface ProblemLocation {
  /** Inclusive start coordinate of the problem span. */
  readonly start_position: Position;
  /** Inclusive end coordinate of the problem span. */
  readonly end_position: Position;
  /** Proto file path, relative to the linter's working directory. */
  readonly path: string;
}

/** A single AIP rule violation reported by the linter. */
export interface Problem {
  /** Human-readable description of the violation. */
  readonly message: string;
  /** Optional replacement text suggested by the rule. */
  readonly suggestion?: string;
  /** Where in the source the problem occurs. */
  readonly location: ProblemLocation;
  /** Fully-qualified rule identifier, e.g. `core::0140::lower-snake`. */
  readonly rule_id: string;
  /** Documentation URL for the violated rule. */
  readonly rule_doc_uri: string;
}

/** The linter's per-file result: a file path and the problems found in it. */
export interface FileResult {
  /** Proto file path, relative to the linter's working directory. */
  readonly file_path: string;
  /** All problems found in the file (may be empty). */
  readonly problems: readonly Problem[];
}

/** The full linter report: one entry per linted file. */
export type LintReport = readonly FileResult[];

/** Parsed, validated action inputs used throughout the run. */
export interface ActionInputs {
  /** Requested api-linter version, or "latest". */
  readonly version: string;
  /** Globs selecting the proto files to lint. */
  readonly paths: readonly string[];
  /** Optional path to an api-linter config file. */
  readonly config: string;
  /** Import search directories passed via `-I`. */
  readonly protoPaths: readonly string[];
  /** Rule names to force-enable. */
  readonly enableRules: readonly string[];
  /** Rule names to force-disable. */
  readonly disableRules: readonly string[];
  /** Ignore in-proto disable comments (strict mode). */
  readonly ignoreCommentDisables: boolean;
  /** FileDescriptorSet files for import resolution. */
  readonly descriptorSetIn: readonly string[];
  /** Skip compilation and lint the descriptor set instead. */
  readonly skipCompilation: boolean;
  /** Format for the written report file. */
  readonly outputFormat: OutputFormat;
  /** Where to write the report, or "" to skip writing a file. */
  readonly outputPath: string;
  /** Emit inline GitHub annotations for each problem. */
  readonly annotate: boolean;
  /** Write a results table to the job summary. */
  readonly jobSummary: boolean;
  /** Fail the job when any problem is reported. */
  readonly failOnError: boolean;
  /** Directory to resolve paths and run the linter from. */
  readonly workingDirectory: string;
  /** Token for GitHub API calls (version resolution, downloads). */
  readonly githubToken: string;
}

/** A resolved host platform mapped to api-linter release-asset naming. */
export interface Platform {
  /** api-linter OS token: `darwin`, `linux` or `windows`. */
  readonly os: string;
  /** api-linter architecture token: `amd64`, `arm64` or `arm`. */
  readonly arch: string;
  /** Executable name: `api-linter` or `api-linter.exe`. */
  readonly binaryName: string;
}
