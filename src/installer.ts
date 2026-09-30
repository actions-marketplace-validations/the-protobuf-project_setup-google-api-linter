/**
 * Downloads, extracts and caches the api-linter binary for the host platform.
 *
 * Uses the GitHub Actions tool-cache so repeated runs on the same self-hosted
 * runner reuse a previously downloaded binary instead of fetching it again.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import { resolvePlatform } from "./platform.ts";
import type { InstallTarget } from "./release.ts";
import type { Platform } from "./types.ts";

/** Tool-cache identifier under which the binary directory is stored. */
const TOOL_NAME = "api-linter";

/**
 * Locate a cached api-linter of the given version, if present.
 *
 * @param version - Concrete version, without a leading `v`.
 * @param platform - The resolved target platform.
 * @returns The absolute binary path, or `undefined` on a cache miss.
 */
function findCached(version: string, platform: Platform): string | undefined {
  const dir = tc.find(TOOL_NAME, version, platform.arch);
  if (!dir) {
    return undefined;
  }
  const binary = path.join(dir, platform.binaryName);
  return fs.existsSync(binary) ? binary : undefined;
}

/**
 * Download and extract api-linter, storing the binary in the tool cache.
 *
 * @param target - The resolved version and download URL.
 * @param platform - The resolved target platform.
 * @returns The absolute path to the extracted, executable binary.
 */
async function download(target: InstallTarget, platform: Platform): Promise<string> {
  const { version, url } = target;
  core.info(`Downloading api-linter from ${url}`);

  let archive: string;
  try {
    archive = await tc.downloadTool(url);
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `Could not download api-linter ${version} for ${platform.os}-${platform.arch} ` +
        `from ${url}: ${detail}. Not every release publishes a build for every ` +
        "platform — v2.4.0, for instance, attached only a Windows binary. " +
        'Use version: "latest" to select the newest release that has one.',
    );
  }
  const extracted = await tc.extractTar(archive);
  const cachedDir = await tc.cacheDir(extracted, TOOL_NAME, version, platform.arch);

  const binary = path.join(cachedDir, platform.binaryName);
  if (!fs.existsSync(binary)) {
    throw new Error(`Extracted archive did not contain "${platform.binaryName}".`);
  }
  if (platform.os !== "windows") {
    fs.chmodSync(binary, 0o755);
  }
  return binary;
}

/**
 * Ensure api-linter of the requested version is installed and on `PATH`.
 *
 * @param target - The resolved version and download URL.
 * @returns The absolute path to the api-linter binary.
 */
export async function installApiLinter(target: InstallTarget): Promise<string> {
  const platform = resolvePlatform();
  const { version } = target;

  const cached = findCached(version, platform);
  const binary = cached ?? (await download(target, platform));
  if (cached) {
    core.info(`Using cached api-linter ${version}.`);
  }

  core.addPath(path.dirname(binary));
  return binary;
}
