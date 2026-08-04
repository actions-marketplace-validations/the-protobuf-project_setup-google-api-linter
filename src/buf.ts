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
 * @param buf - The buf command or path to invoke.
 * @param input - The buf input to export (a directory containing `buf.yaml`).
 * @param config - Optional explicit `buf.yaml` path (passed as `--config`).
 * @param cwd - Working directory to resolve `input` against.
 * @returns The absolute path to the directory the deps were exported into.
 * @throws If `buf export` fails.
 */
async function exportDeps(
  buf: string,
  input: string,
  config: string,
  cwd: string,
): Promise<string> {
  const vendorDir = fs.mkdtempSync(path.join(os.tmpdir(), "buf-export-"));
  const args = ["export", input, "-o", vendorDir];
  if (config) {
    args.push("--config", config);
  }
  const result = await exec.getExecOutput(buf, args, {
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
 * Resolve the buf executable to use: an explicit `buf-path`, otherwise buf from
 * `PATH`, otherwise an auto-installed release.
 *
 * @param inputs - The parsed action inputs.
 * @returns The buf command or path to invoke.
 * @throws If an explicit `buf-path` is given but does not exist.
 */
async function resolveBuf(inputs: ActionInputs): Promise<string> {
  if (inputs.bufPath) {
    if (!fs.existsSync(inputs.bufPath)) {
      throw new Error(`buf-path does not exist: ${inputs.bufPath}`);
    }
    core.info(`Using buf from buf-path: ${inputs.bufPath}`);
    return inputs.bufPath;
  }
  return ensureBuf(inputs.bufVersion, inputs.githubToken);
}

/**
 * Ensure buf is available and export the configured module's dependencies.
 *
 * @param inputs - The parsed action inputs (uses the `buf*` fields).
 * @returns The vendor directory to add to api-linter's import paths.
 */
export async function resolveBufImports(inputs: ActionInputs): Promise<string> {
  const buf = await resolveBuf(inputs);
  const vendorDir = await exportDeps(
    buf,
    inputs.bufInput,
    inputs.bufConfig,
    inputs.workingDirectory,
  );
  core.info(`Resolved buf.yaml dependencies into import path: ${vendorDir}`);
  return vendorDir;
}
