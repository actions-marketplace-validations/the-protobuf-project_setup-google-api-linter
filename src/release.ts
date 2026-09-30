/**
 * Resolves the requested api-linter version to a concrete version and a
 * download URL for the host platform.
 *
 * Explicit versions are resolved offline from api-linter's asset naming
 * convention, so pinned runs need no GitHub API call. `"latest"` is resolved
 * against the releases API and, crucially, skips releases that publish no
 * asset for the host: api-linter v2.4.0 shipped a single `api-linter.tar.gz`
 * holding a Windows binary and no darwin or linux build at all, so taking the
 * newest tag on trust yields a download that cannot work.
 */

import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";
import { assetMatchesPlatform, assetUrl } from "./platform.ts";
import type { Platform } from "./types.ts";
import { stripLeadingV } from "./version.ts";

/** GitHub repository that publishes api-linter releases. */
const API_LINTER_REPO = "googleapis/api-linter";

/** How many recent releases to consider when resolving `"latest"`. */
const RELEASE_PAGE_SIZE = 30;

/** A downloadable file attached to a GitHub release. */
export interface ReleaseAsset {
  /** The asset filename, e.g. `api-linter-2.3.1-linux-amd64.tar.gz`. */
  readonly name: string;
  /** Direct download URL for the asset. */
  readonly browser_download_url: string;
}

/** Minimal shape of the GitHub releases API entries we rely on. */
export interface Release {
  /** The release tag, e.g. `v2.3.1`. */
  readonly tag_name?: string;
  /** True for unpublished draft releases. */
  readonly draft?: boolean;
  /** True for pre-releases, which are never selected for `"latest"`. */
  readonly prerelease?: boolean;
  /** Files attached to the release. */
  readonly assets?: readonly ReleaseAsset[];
}

/** A concrete version plus the URL to fetch it from. */
export interface InstallTarget {
  /** Concrete version, without a leading `v`. */
  readonly version: string;
  /** Absolute download URL of the platform's asset. */
  readonly url: string;
}

/**
 * Pick the asset matching the host platform from a release's attachments.
 *
 * @param assets - The release's attached files.
 * @param platform - The resolved target platform.
 * @returns The matching asset, or `undefined` when the release has none.
 */
export function selectPlatformAsset(
  assets: readonly ReleaseAsset[],
  platform: Platform,
): ReleaseAsset | undefined {
  return assets.find((asset) => assetMatchesPlatform(asset.name, platform));
}

/**
 * Fetch the most recent releases of a repository, newest first.
 *
 * @param repo - The `owner/name` of the GitHub repository.
 * @param token - Optional token used to raise the API rate limit.
 * @returns The releases as returned by the API.
 * @throws If the API request fails.
 */
export async function fetchReleases(repo: string, token: string): Promise<readonly Release[]> {
  const client = new HttpClient("setup-google-api-linter");
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const url = `https://api.github.com/repos/${repo}/releases?per_page=${RELEASE_PAGE_SIZE}`;
  const response = await client.getJson<readonly Release[]>(url, headers);
  if (response.statusCode >= 400 || !response.result) {
    throw new Error(
      `Failed to list ${repo} releases (HTTP ${response.statusCode}). ` +
        "Pin an explicit version to avoid the GitHub API.",
    );
  }
  return response.result;
}

/**
 * Choose the newest published release that ships a build for the platform.
 *
 * Drafts and pre-releases are ignored. Releases without a usable asset are
 * skipped with a warning naming what they did publish, so a broken upstream
 * release is visible in the log rather than silently changing which version
 * gets installed.
 *
 * @param releases - Releases, newest first, as returned by the API.
 * @param platform - The resolved target platform.
 * @returns The chosen version and asset URL.
 * @throws If no release in the list has an asset for this platform.
 */
export function selectLatestTarget(
  releases: readonly Release[],
  platform: Platform,
): InstallTarget {
  const target = `${platform.os}-${platform.arch}`;
  for (const release of releases) {
    if (release.draft || release.prerelease || !release.tag_name) {
      continue;
    }
    const version = stripLeadingV(release.tag_name);
    const asset = selectPlatformAsset(release.assets ?? [], platform);
    if (asset) {
      return { version, url: asset.browser_download_url };
    }
    const published = (release.assets ?? []).map((a) => a.name).join(", ") || "no assets";
    core.warning(
      `api-linter ${version} publishes no ${target} build (${published}); ` +
        "falling back to an older release.",
    );
  }
  throw new Error(
    `None of the ${releases.length} most recent ${API_LINTER_REPO} releases ` +
      `publish a ${target} build. Pin a version known to have one, ` +
      "for example version: 2.3.1.",
  );
}

/**
 * Resolve the `version` input to a concrete version and download URL.
 *
 * @param requested - The raw `version` input ("latest" or an explicit version).
 * @param token - Optional GitHub token for the `"latest"` lookup.
 * @param platform - The resolved target platform.
 * @returns The version to install and the URL to fetch it from.
 */
export async function resolveInstallTarget(
  requested: string,
  token: string,
  platform: Platform,
): Promise<InstallTarget> {
  if (requested.toLowerCase() !== "latest") {
    const version = stripLeadingV(requested);
    return { version, url: assetUrl(version, platform) };
  }

  const releases = await fetchReleases(API_LINTER_REPO, token);
  const resolved = selectLatestTarget(releases, platform);
  core.info(`Resolved latest ${API_LINTER_REPO} version to ${resolved.version}.`);
  return resolved;
}
