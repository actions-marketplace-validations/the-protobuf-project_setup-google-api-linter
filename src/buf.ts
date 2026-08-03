/**
 * Buf integration: resolve the dependencies declared in a `buf.yaml` so that
 * api-linter can find imported protos (for example `google/api/*`).
 *
 * The dependencies are materialised onto disk with `buf export`, and the
 * resulting directory is returned so the caller can add it as an api-linter
 * import path (`-I`). This keeps normal compilation-based linting intact while
 * making Buf Schema Registry dependencies resolvable.
 */

import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import * as core from "@actions/core";
import * as exec from "@actions/exec";
import { ensureBuf } from "./buf-install.ts";
import type { ActionInputs } from "./types.ts";

/**
 * Export a Buf module's dependencies (and files) to a fresh temp directory.
 *
 * @param buf - The buf command or path from {@link ensureBuf}.
 * @param input - The buf input to export (a directory containing `buf.yaml`).
 * @param cwd - Working directory to resolve `input` against.
 * @returns The absolute path to the directory the deps were exported into.
 * @throws If `buf export` fails.
 */
async function exportDeps(buf: string, input: string, cwd: string): Promise<string> {
  const vendorDir = fs.mkdtempSync(path.join(os.tmpdir(), "buf-export-"));
  const result = await exec.getExecOutput(buf, ["export", input, "-o", vendorDir], {
    cwd,
    ignoreReturnCode: true,
    silent: true,
  });
  if (result.exitCode !== 0) {
    throw new Error(`"buf export" failed (exit ${result.exitCode}): ${result.stderr.trim()}`);
  }
  return vendorDir;
}

/**
 * Ensure buf is installed and export the configured module's dependencies.
 *
 * @param inputs - The parsed action inputs (uses the `buf*` fields).
 * @returns The vendor directory to add to api-linter's import paths.
 */
export async function resolveBufImports(inputs: ActionInputs): Promise<string> {
  const buf = await ensureBuf(inputs.bufVersion, inputs.githubToken);
  const vendorDir = await exportDeps(buf, inputs.bufInput, inputs.workingDirectory);
  core.info(`Resolved buf.yaml dependencies into import path: ${vendorDir}`);
  return vendorDir;
}
