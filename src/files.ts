/**
 * Filesystem helpers: resolving proto globs and materialising the report file.
 *
 * Proto files are resolved to paths relative to the linter's working directory
 * so that api-linter echoes those same relative paths back in its report,
 * which in turn makes GitHub annotations resolve to the right source files.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as glob from "@actions/glob";

/**
 * Expand the given globs into a sorted, de-duplicated list of proto files.
 *
 * @param patterns - Globs, relative to `workingDirectory` (or absolute).
 * @param workingDirectory - Directory the linter runs in.
 * @returns Matching file paths, relative to `workingDirectory`.
 */
export async function resolveProtoFiles(
  patterns: readonly string[],
  workingDirectory: string,
): Promise<string[]> {
  const root = path.resolve(workingDirectory);
  const absolutePatterns = patterns.map((pattern) =>
    path.isAbsolute(pattern) ? pattern : path.join(root, pattern),
  );

  const globber = await glob.create(absolutePatterns.join("\n"), {
    matchDirectories: false,
  });
  const matches = await globber.glob();

  const relative = matches.map((file) => path.relative(root, file));
  return [...new Set(relative)].sort();
}

/**
 * Ensure the parent directory of a file path exists.
 *
 * @param filePath - The file whose parent directory should exist.
 */
export function ensureParentDir(filePath: string): void {
  fs.mkdirSync(path.dirname(path.resolve(filePath)), { recursive: true });
}

/**
 * Copy a file, creating the destination directory if necessary.
 *
 * @param source - Existing source file path.
 * @param destination - Destination file path.
 * @returns The absolute destination path.
 */
export function copyReport(source: string, destination: string): string {
  const target = path.resolve(destination);
  ensureParentDir(target);
  fs.copyFileSync(source, target);
  return target;
}
