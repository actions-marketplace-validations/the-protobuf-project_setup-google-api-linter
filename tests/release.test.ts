/**
 * Unit tests for release-asset selection.
 *
 * The regression these cover: api-linter v2.4.0 published a single
 * `api-linter.tar.gz` containing a Windows binary and no darwin or linux build,
 * so resolving `"latest"` to the newest tag produced an unusable download.
 */

import { describe, expect, test } from "bun:test";
import { resolvePlatform } from "../src/platform.ts";
import {
  type Release,
  resolveInstallTarget,
  selectLatestTarget,
  selectPlatformAsset,
} from "../src/release.ts";

const linux = resolvePlatform("linux", "x64");
const darwinArm = resolvePlatform("darwin", "arm64");
const linuxArm = resolvePlatform("linux", "arm");

/** Build a release entry with per-platform assets, as releases ≤ 2.3.1 have. */
function perPlatformRelease(version: string, overrides: Partial<Release> = {}): Release {
  const targets = ["darwin-amd64", "darwin-arm64", "linux-amd64", "linux-arm", "windows-amd64"];
  return {
    tag_name: `v${version}`,
    assets: targets.map((t) => ({
      name: `api-linter-${version}-${t}.tar.gz`,
      browser_download_url: `https://example.test/v${version}/api-linter-${version}-${t}.tar.gz`,
    })),
    ...overrides,
  };
}

/** The real shape of the broken v2.4.0 release: one generic, Windows-only asset. */
const broken240: Release = {
  tag_name: "v2.4.0",
  assets: [
    {
      name: "api-linter.tar.gz",
      browser_download_url: "https://example.test/v2.4.0/api-linter.tar.gz",
    },
  ],
};

describe("selectPlatformAsset", () => {
  test("picks the asset for the host platform", () => {
    const assets = perPlatformRelease("2.3.1").assets ?? [];
    expect(selectPlatformAsset(assets, linux)?.name).toBe("api-linter-2.3.1-linux-amd64.tar.gz");
    expect(selectPlatformAsset(assets, darwinArm)?.name).toBe(
      "api-linter-2.3.1-darwin-arm64.tar.gz",
    );
  });

  test("does not match linux-arm against a linux-arm64 asset", () => {
    const assets = [
      { name: "api-linter-9.9.9-linux-arm64.tar.gz", browser_download_url: "https://example.test" },
    ];
    expect(selectPlatformAsset(assets, linuxArm)).toBeUndefined();
  });

  test("rejects a generic asset that names no platform", () => {
    expect(selectPlatformAsset(broken240.assets ?? [], linux)).toBeUndefined();
    expect(selectPlatformAsset(broken240.assets ?? [], darwinArm)).toBeUndefined();
  });

  test("rejects assets the installer cannot extract", () => {
    const assets = [
      { name: "api-linter-2.3.1-linux-amd64.zip", browser_download_url: "https://example.test" },
    ];
    expect(selectPlatformAsset(assets, linux)).toBeUndefined();
  });
});

describe("selectLatestTarget", () => {
  test("skips a release with no build for the host and takes the next one", () => {
    const target = selectLatestTarget([broken240, perPlatformRelease("2.3.1")], linux);
    expect(target).toEqual({
      version: "2.3.1",
      url: "https://example.test/v2.3.1/api-linter-2.3.1-linux-amd64.tar.gz",
    });
  });

  test("takes the newest release when it does publish a host build", () => {
    const target = selectLatestTarget(
      [perPlatformRelease("2.4.1"), perPlatformRelease("2.3.1")],
      linux,
    );
    expect(target.version).toBe("2.4.1");
  });

  test("ignores drafts and pre-releases", () => {
    const releases = [
      perPlatformRelease("3.0.0", { draft: true }),
      perPlatformRelease("2.9.0", { prerelease: true }),
      perPlatformRelease("2.3.1"),
    ];
    expect(selectLatestTarget(releases, linux).version).toBe("2.3.1");
  });

  test("ignores entries with no tag", () => {
    const releases = [{ assets: [] } as Release, perPlatformRelease("2.3.1")];
    expect(selectLatestTarget(releases, linux).version).toBe("2.3.1");
  });

  test("fails with an actionable message when nothing has a host build", () => {
    expect(() => selectLatestTarget([broken240], linux)).toThrow(/publish a linux-amd64 build/);
    expect(() => selectLatestTarget([broken240], linux)).toThrow(/version: 2\.3\.1/);
  });
});

describe("resolveInstallTarget", () => {
  test("resolves an explicit version offline from the naming convention", async () => {
    await expect(resolveInstallTarget("v1.69.2", "", linux)).resolves.toEqual({
      version: "1.69.2",
      url: "https://github.com/googleapis/api-linter/releases/download/v1.69.2/api-linter-1.69.2-linux-amd64.tar.gz",
    });
  });

  test("passes bare explicit versions straight through", async () => {
    const target = await resolveInstallTarget("1.68.0", "", darwinArm);
    expect(target.version).toBe("1.68.0");
    expect(target.url).toContain("api-linter-1.68.0-darwin-arm64.tar.gz");
  });
});
