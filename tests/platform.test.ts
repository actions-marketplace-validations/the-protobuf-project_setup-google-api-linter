/** Unit tests for host → api-linter release-asset mapping. */

import { describe, expect, test } from "bun:test";
import { assetMatchesPlatform, assetName, assetUrl, resolvePlatform } from "../src/platform.ts";

describe("resolvePlatform", () => {
  test("maps macOS arm64 to darwin/arm64", () => {
    expect(resolvePlatform("darwin", "arm64")).toEqual({
      os: "darwin",
      arch: "arm64",
      binaryName: "api-linter",
    });
  });

  test("maps linux x64 to linux/amd64", () => {
    expect(resolvePlatform("linux", "x64")).toEqual({
      os: "linux",
      arch: "amd64",
      binaryName: "api-linter",
    });
  });

  test("maps windows x64 and uses the .exe binary name", () => {
    expect(resolvePlatform("win32", "x64")).toEqual({
      os: "windows",
      arch: "amd64",
      binaryName: "api-linter.exe",
    });
  });

  test("throws for a published-OS but unpublished arch (linux/arm64)", () => {
    expect(() => resolvePlatform("linux", "arm64")).toThrow(/No api-linter release asset/);
  });

  test("throws for an unknown operating system", () => {
    expect(() => resolvePlatform("freebsd", "x64")).toThrow(/Unsupported host/);
  });

  test("throws for an unknown architecture", () => {
    expect(() => resolvePlatform("linux", "s390x")).toThrow(/Unsupported host/);
  });
});

describe("assetName / assetUrl", () => {
  const platform = resolvePlatform("linux", "x64");

  test("builds the tarball filename", () => {
    expect(assetName("1.69.2", platform)).toBe("api-linter-1.69.2-linux-amd64.tar.gz");
  });

  test("builds the full download URL with a v-prefixed tag", () => {
    expect(assetUrl("1.69.2", platform)).toBe(
      "https://github.com/googleapis/api-linter/releases/download/v1.69.2/api-linter-1.69.2-linux-amd64.tar.gz",
    );
  });
});

describe("assetMatchesPlatform", () => {
  const linux = resolvePlatform("linux", "x64");
  const linuxArm = resolvePlatform("linux", "arm");
  const windows = resolvePlatform("win32", "x64");

  test("matches the host's per-platform tarball", () => {
    expect(assetMatchesPlatform("api-linter-2.3.1-linux-amd64.tar.gz", linux)).toBe(true);
  });

  test("accepts a .tgz extension", () => {
    expect(assetMatchesPlatform("api-linter-2.3.1-linux-amd64.tgz", linux)).toBe(true);
  });

  test("rejects another platform's tarball", () => {
    expect(assetMatchesPlatform("api-linter-2.3.1-darwin-arm64.tar.gz", linux)).toBe(false);
    expect(assetMatchesPlatform("api-linter-2.3.1-windows-amd64.tar.gz", linux)).toBe(false);
  });

  test("rejects a bare name that encodes no platform", () => {
    expect(assetMatchesPlatform("api-linter.tar.gz", linux)).toBe(false);
    expect(assetMatchesPlatform("api-linter.tar.gz", windows)).toBe(false);
  });

  test("stops linux-arm matching inside linux-arm64", () => {
    expect(assetMatchesPlatform("api-linter-2.3.1-linux-arm64.tar.gz", linuxArm)).toBe(false);
    expect(assetMatchesPlatform("api-linter-2.3.1-linux-arm.tar.gz", linuxArm)).toBe(true);
  });

  test("rejects non-tar archives and checksum files", () => {
    expect(assetMatchesPlatform("api-linter-2.3.1-linux-amd64.zip", linux)).toBe(false);
    expect(assetMatchesPlatform("api-linter-2.3.1-linux-amd64.tar.gz.sha256", linux)).toBe(false);
  });
});
