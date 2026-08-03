/**
 * Parses api-linter JSON output and turns it into GitHub-native feedback:
 * inline annotations and a job-summary table.
 */

import * as path from "node:path";
import * as core from "@actions/core";
import type { LintReport, Problem } from "./types.ts";

/** Maximum number of rows rendered in the job-summary table. */
const MAX_SUMMARY_ROWS = 100;

/** A single table cell; mirrors `@actions/core`'s `SummaryTableCell`. */
interface TableCell {
  /** Cell content. */
  readonly data: string;
  /** Render the cell as a header cell. */
  readonly header?: boolean;
}

/** A row of the summary table: header cells or plain string cells. */
type TableRow = (TableCell | string)[];

/**
 * Parse api-linter JSON output into a typed {@link LintReport}.
 *
 * @param json - Raw JSON produced by `--output-format json`.
 * @returns The parsed report (empty when `json` is blank).
 * @throws If the payload is present but not a JSON array.
 */
export function parseReport(json: string): LintReport {
  const trimmed = json.trim();
  if (trimmed.length === 0) {
    return [];
  }
  const parsed: unknown = JSON.parse(trimmed);
  if (!Array.isArray(parsed)) {
    throw new Error("Unexpected api-linter output: JSON root was not an array.");
  }
  return parsed as LintReport;
}

/**
 * Count every problem across all files in a report.
 *
 * @param report - The parsed lint report.
 * @returns The total number of problems.
 */
export function countProblems(report: LintReport): number {
  return report.reduce((total, file) => total + file.problems.length, 0);
}

/**
 * Resolve a linter-relative file path to one relative to the checkout root, so
 * that GitHub can match the annotation to the right source file.
 *
 * The linter reports paths relative to its working directory; annotations must
 * be relative to `GITHUB_WORKSPACE`. Files outside the workspace fall back to an
 * absolute path.
 *
 * @param workingDirectory - Directory the linter ran in.
 * @param filePath - Path as reported by the linter.
 * @returns The path relative to the workflow's checkout root.
 */
function repoRelativePath(workingDirectory: string, filePath: string): string {
  const absolute = path.resolve(workingDirectory, filePath);
  const root = process.env.GITHUB_WORKSPACE ?? process.cwd();
  const relative = path.relative(root, absolute);
  return relative.startsWith("..") || path.isAbsolute(relative) ? absolute : relative;
}

/**
 * Emit a single inline GitHub error annotation for a problem.
 *
 * @param problem - The problem to annotate.
 * @param workingDirectory - Directory the linter ran in.
 */
function annotateProblem(problem: Problem, workingDirectory: string): void {
  const { location } = problem;
  core.error(`${problem.message} (${problem.rule_doc_uri})`, {
    title: problem.rule_id,
    file: repoRelativePath(workingDirectory, location.path),
    startLine: location.start_position.line_number,
    startColumn: location.start_position.column_number,
    endLine: location.end_position.line_number,
    endColumn: location.end_position.column_number,
  });
}

/**
 * Emit inline annotations for every problem in the report.
 *
 * @param report - The parsed lint report.
 * @param workingDirectory - Directory the linter ran in.
 */
export function annotate(report: LintReport, workingDirectory: string): void {
  for (const file of report) {
    for (const problem of file.problems) {
      annotateProblem(problem, workingDirectory);
    }
  }
}

/** Escape the HTML-significant characters used by the summary table. */
function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

/** Build the summary table rows (header first) from the report. */
function summaryRows(report: LintReport): TableRow[] {
  const header: TableRow = [
    { data: "File", header: true },
    { data: "Line", header: true },
    { data: "Rule", header: true },
    { data: "Message", header: true },
  ];

  const rows: TableRow[] = [header];
  for (const file of report) {
    for (const problem of file.problems) {
      if (rows.length > MAX_SUMMARY_ROWS) {
        return rows;
      }
      rows.push([
        escapeHtml(file.file_path),
        String(problem.location.start_position.line_number),
        `<a href="${problem.rule_doc_uri}">${escapeHtml(problem.rule_id)}</a>`,
        escapeHtml(problem.message),
      ]);
    }
  }
  return rows;
}

/**
 * Write a results table (or a success note) to the GitHub job summary.
 *
 * @param report - The parsed lint report.
 * @param version - The concrete api-linter version that ran.
 * @returns A promise that resolves once the summary has been written.
 */
export async function writeSummary(report: LintReport, version: string): Promise<void> {
  const total = countProblems(report);
  const builder = core.summary
    .addHeading("Google API Linter", 2)
    .addRaw(`api-linter \`v${version}\` checked ${report.length} file(s).`, true);

  if (total === 0) {
    await builder.addRaw("✅ No problems found.", true).write();
    return;
  }

  builder.addRaw(`❌ Found **${total}** problem(s).`, true).addTable(summaryRows(report));
  if (total > MAX_SUMMARY_ROWS) {
    builder.addRaw(`_Showing the first ${MAX_SUMMARY_ROWS} problems._`, true);
  }
  await builder.write();
}
