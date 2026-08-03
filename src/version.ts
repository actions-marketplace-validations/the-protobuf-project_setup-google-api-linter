/**
 * Resolves the requested api-linter version to a concrete semantic version.
 *
 * `"latest"` is resolved by querying the GitHub releases API; explicit versions
 * are simply normalised (a leading `v` is stripped). The result never carries a
 * `v` prefix, matching how api-linter names its release assets.
 */

import * as core from "@actions/core";
import { HttpClient } from "@actions/http-client";

/** Minimal shape of the GitHub "latest release" API response we rely on. */
interface LatestReleaseResponse {
  /** The release tag, e.g. `v1.69.2`. */
  readonly tag_name?: string;
}

/**
 * Remove a single leading `v`/`V` from a version string.
 *
 * @param version - A version that may carry a `v` prefix.
 * @returns The version without a leading `v`.
 */
export function stripLeadingV(version: string): string {
  return version.replace(/^v/i, "");
}

/**
 * Query GitHub for the tag name of a repository's latest release.
 *
 * @param repo - The `owner/name` of the GitHub repository.
 * @param token - Optional token used to raise the API rate limit.
 * @returns The release version, without a leading `v`.
 * @throws If the API request fails or returns no usable tag.
 */
export async function latestReleaseVersion(repo: string, token: string): Promise<string> {
  const client = new HttpClient("setup-google-api-linter");
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const url = `https://api.github.com/repos/${repo}/releases/latest`;
  const response = await client.getJson<LatestReleaseResponse>(url, headers);
  if (response.statusCode >= 400 || !response.result?.tag_name) {
    throw new Error(
      `Failed to resolve the latest ${repo} version (HTTP ${response.statusCode}). ` +
        "Pin an explicit version to avoid the GitHub API.",
    );
  }
  return stripLeadingV(response.result.tag_name);
}

/**
 * Resolve a requested version ("latest" or explicit) for a GitHub repository.
 *
 * @param repo - The `owner/name` of the GitHub repository.
 * @param requested - The raw version input ("latest" or an explicit version).
 * @param token - Optional GitHub token for the "latest" lookup.
 * @returns The concrete version, without a leading `v`.
 */
export async function resolveReleaseVersion(
  repo: string,
  requested: string,
  token: string,
): Promise<string> {
  if (requested.toLowerCase() === "latest") {
    const version = await latestReleaseVersion(repo, token);
    core.info(`Resolved latest ${repo} version to ${version}.`);
    return version;
  }
  return stripLeadingV(requested);
}

/** GitHub repository that publishes api-linter releases. */
const API_LINTER_REPO = "googleapis/api-linter";

/**
 * Resolve the `version` input to a concrete api-linter version.
 *
 * @param requested - The raw `version` input ("latest" or an explicit version).
 * @param token - Optional GitHub token for the "latest" lookup.
 * @returns The concrete version, without a leading `v`.
 */
export function resolveVersion(requested: string, token: string): Promise<string> {
  return resolveReleaseVersion(API_LINTER_REPO, requested, token);
}
