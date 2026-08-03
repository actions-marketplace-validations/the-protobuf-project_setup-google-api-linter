/** Unit tests for host → api-linter release-asset mapping. */

import { describe, expect, test } from "bun:test";
import { assetName, assetUrl, resolvePlatform } from "../src/platform.ts";

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
