/**
 * Ensures the `buf` CLI is available, installing it from GitHub releases when
 * it is not already on `PATH`.
 *
 * buf publishes a raw executable per platform named `buf-<OS>-<ARCH>` (with a
 * `.exe` suffix on Windows), which keeps installation to a single download.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as core from "@actions/core";
import * as io from "@actions/io";
import * as tc from "@actions/tool-cache";
import { resolveReleaseVersion } from "./version.ts";

/** GitHub repository that publishes buf releases. */
const BUF_REPO = "bufbuild/buf";

/** Maps Node's `process.platform` to buf's OS token. */
const OS_MAP: Readonly<Record<string, string>> = {
  darwin: "Darwin",
  linux: "Linux",
  win32: "Windows",
};

/** Maps Node's `process.arch` (per OS) to buf's architecture token. */
const ARCH_MAP: Readonly<Record<string, Readonly<Record<string, string>>>> = {
  Darwin: { x64: "x86_64", arm64: "arm64" },
  Linux: { x64: "x86_64", arm64: "aarch64", arm: "armv7" },
  Windows: { x64: "x86_64", arm64: "arm64" },
};

/** The download URL and binary name for a buf release on this host. */
interface BufAsset {
  /** Absolute download URL for the raw executable. */
  readonly url: string;
  /** Local executable name (`buf` or `buf.exe`). */
  readonly binaryName: string;
}

/**
 * Resolve the buf release asset for a version and the current host.
 *
 * @param version - Concrete buf version, without a leading `v`.
 * @returns The asset URL and local binary name.
 * @throws If the host OS/arch has no published buf build.
 */
export function resolveBufAsset(version: string): BufAsset {
  const os = OS_MAP[process.platform];
  const arch = os ? ARCH_MAP[os]?.[process.arch] : undefined;
  if (!os || !arch) {
    throw new Error(`Unsupported host for buf: ${process.platform}/${process.arch}.`);
  }
  const suffix = os === "Windows" ? ".exe" : "";
  const file = `buf-${os}-${arch}${suffix}`;
  return {
    url: `https://github.com/${BUF_REPO}/releases/download/v${version}/${file}`,
    binaryName: os === "Windows" ? "buf.exe" : "buf",
  };
}

/**
 * Download and cache a specific buf version, returning the binary path.
 *
 * @param requestedVersion - buf version to install, or "latest".
 * @param token - Optional GitHub token for version resolution.
 * @returns The absolute path to the cached buf executable.
 */
async function installBuf(requestedVersion: string, token: string): Promise<string> {
  const version = await resolveReleaseVersion(BUF_REPO, requestedVersion, token);
  const asset = resolveBufAsset(version);

  const cached = tc.find("buf", version, process.arch);
  const cachedBinary = cached ? path.join(cached, asset.binaryName) : "";
  if (cachedBinary && fs.existsSync(cachedBinary)) {
    core.addPath(cached);
    return cachedBinary;
  }

  core.info(`Installing buf ${version} from ${asset.url}`);
  const download = await tc.downloadTool(asset.url);
  const cachedFile = await tc.cacheFile(download, asset.binaryName, "buf", version, process.arch);
  const binary = path.join(cachedFile, asset.binaryName);
  if (process.platform !== "win32") {
    fs.chmodSync(binary, 0o755);
  }
  core.addPath(cachedFile);
  return binary;
}

/**
 * Ensure buf is available, preferring an existing install on `PATH`.
 *
 * @param requestedVersion - buf version to install when absent, or "latest".
 * @param token - Optional GitHub token for version resolution.
 * @returns The buf command (bare `buf` when already on `PATH`, else a path).
 */
export async function ensureBuf(requestedVersion: string, token: string): Promise<string> {
  const existing = await io.which("buf", false);
  if (existing) {
    core.info(`Using buf already on PATH: ${existing}`);
    return existing;
  }
  return installBuf(requestedVersion, token);
}
