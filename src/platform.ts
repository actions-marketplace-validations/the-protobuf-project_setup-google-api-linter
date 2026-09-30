/**
 * Maps the host operating system and CPU architecture onto the naming scheme
 * used by api-linter's GitHub release assets.
 *
 * Release assets are named `api-linter-<version>-<os>-<arch>.tar.gz`. Only the
 * combinations that Google actually publishes are supported; anything else
 * raises a clear error rather than attempting an impossible download.
 */

import type { Platform } from "./types.ts";

/** Maps Node's `process.platform` to api-linter's OS token. */
const OS_MAP: Readonly<Record<string, string>> = {
  darwin: "darwin",
  linux: "linux",
  win32: "windows",
};

/** Maps Node's `process.arch` to api-linter's architecture token. */
const ARCH_MAP: Readonly<Record<string, string>> = {
  x64: "amd64",
  arm64: "arm64",
  arm: "arm",
};

/**
 * The set of `os-arch` combinations published by googleapis/api-linter.
 * Kept explicit so unsupported hosts (e.g. linux-arm64) fail loudly.
 */
const SUPPORTED: ReadonlySet<string> = new Set([
  "darwin-amd64",
  "darwin-arm64",
  "linux-amd64",
  "linux-arm",
  "windows-amd64",
]);

/**
 * Resolve the current host (or the provided override) to a {@link Platform}.
 *
 * @param nodePlatform - Node platform token; defaults to `process.platform`.
 * @param nodeArch - Node architecture token; defaults to `process.arch`.
 * @returns The api-linter asset tokens plus the binary name for this host.
 * @throws If the host OS/arch is not published by api-linter.
 */
export function resolvePlatform(
  nodePlatform: NodeJS.Platform = process.platform,
  nodeArch: string = process.arch,
): Platform {
  const os = OS_MAP[nodePlatform];
  const arch = ARCH_MAP[nodeArch];

  if (!os || !arch) {
    throw new Error(
      `Unsupported host ${nodePlatform}/${nodeArch}. ` +
        "api-linter publishes darwin, linux and windows builds only.",
    );
  }

  const key = `${os}-${arch}`;
  if (!SUPPORTED.has(key)) {
    throw new Error(
      `No api-linter release asset exists for ${key}. ` +
        `Supported targets: ${[...SUPPORTED].join(", ")}.`,
    );
  }

  return {
    os,
    arch,
    binaryName: os === "windows" ? "api-linter.exe" : "api-linter",
  };
}

/**
 * Build the release asset filename for a version and platform.
 *
 * @param version - Concrete semantic version, without a leading `v`.
 * @param platform - The resolved target platform.
 * @returns The `.tar.gz` asset filename, e.g. `api-linter-1.69.2-linux-amd64.tar.gz`.
 */
export function assetName(version: string, platform: Platform): string {
  return `api-linter-${version}-${platform.os}-${platform.arch}.tar.gz`;
}

/**
 * Build the full GitHub download URL for a release asset.
 *
 * @param version - Concrete semantic version, without a leading `v`.
 * @param platform - The resolved target platform.
 * @returns The absolute download URL for the asset.
 */
export function assetUrl(version: string, platform: Platform): string {
  const file = assetName(version, platform);
  return `https://github.com/googleapis/api-linter/releases/download/v${version}/${file}`;
}

/** Archive extensions the installer knows how to extract. */
const TAR_EXTENSION = /\.(?:tar\.gz|tgz)$/i;

/**
 * Report whether a release asset is the build for the given platform.
 *
 * Matching is by the `-<os>-<arch>` token api-linter puts in its asset names,
 * required to end on a token boundary so `linux-arm` does not match a
 * `linux-arm64` asset. Names carrying no platform tokens (such as the bare
 * `api-linter.tar.gz` published for v2.4.0, which holds a Windows binary) are
 * rejected: there is no way to tell what host they are for, and installing the
 * wrong architecture fails later and less clearly.
 *
 * @param name - The release asset filename.
 * @param platform - The resolved target platform.
 * @returns True when the asset is an extractable build for this platform.
 */
export function assetMatchesPlatform(name: string, platform: Platform): boolean {
  if (!TAR_EXTENSION.test(name)) {
    return false;
  }
  const token = `-${platform.os}-${platform.arch}`;
  const index = name.toLowerCase().indexOf(token.toLowerCase());
  if (index === -1) {
    return false;
  }
  const next = name.charAt(index + token.length);
  return next === "" || !/[0-9a-z]/i.test(next);
}
