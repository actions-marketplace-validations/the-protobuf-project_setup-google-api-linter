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

/** GitHub API endpoint for the newest api-linter release. */
const LATEST_URL = "https://api.github.com/repos/googleapis/api-linter/releases/latest";

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
 * Query GitHub for the tag name of the latest api-linter release.
 *
 * @param token - Optional token used to raise the API rate limit.
 * @returns The concrete version, without a leading `v`.
 * @throws If the API request fails or returns no usable tag.
 */
async function fetchLatestVersion(token: string): Promise<string> {
  const client = new HttpClient("setup-google-api-linter");
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
  };
  if (token) {
    headers.authorization = `Bearer ${token}`;
  }

  const response = await client.getJson<LatestReleaseResponse>(LATEST_URL, headers);
  if (response.statusCode >= 400 || !response.result?.tag_name) {
    throw new Error(
      `Failed to resolve the latest api-linter version (HTTP ${response.statusCode}). ` +
        "Pin an explicit version input to avoid the GitHub API.",
    );
  }
  return stripLeadingV(response.result.tag_name);
}

/**
 * Resolve the `version` input to a concrete api-linter version.
 *
 * @param requested - The raw `version` input ("latest" or an explicit version).
 * @param token - Optional GitHub token for the "latest" lookup.
 * @returns The concrete version, without a leading `v`.
 */
export async function resolveVersion(requested: string, token: string): Promise<string> {
  if (requested.toLowerCase() === "latest") {
    const version = await fetchLatestVersion(token);
    core.info(`Resolved latest api-linter version to ${version}.`);
    return version;
  }
  return stripLeadingV(requested);
}
