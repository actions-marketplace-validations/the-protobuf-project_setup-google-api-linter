/** Unit tests for version normalisation and explicit-version resolution. */

import { describe, expect, test } from "bun:test";
import { resolveVersion, stripLeadingV } from "../src/version.ts";

describe("stripLeadingV", () => {
  test("removes a lowercase v prefix", () => {
    expect(stripLeadingV("v1.69.2")).toBe("1.69.2");
  });

  test("removes an uppercase V prefix", () => {
    expect(stripLeadingV("V2.0.0")).toBe("2.0.0");
  });

  test("leaves an already-bare version untouched", () => {
    expect(stripLeadingV("1.69.2")).toBe("1.69.2");
  });

  test("only strips the first character, not internal vs", () => {
    expect(stripLeadingV("v1.0.0-preview")).toBe("1.0.0-preview");
  });
});

describe("resolveVersion", () => {
  test("normalises an explicit version without touching the network", async () => {
    await expect(resolveVersion("v1.69.2", "")).resolves.toBe("1.69.2");
  });

  test("passes bare explicit versions straight through", async () => {
    await expect(resolveVersion("1.68.0", "")).resolves.toBe("1.68.0");
  });
});
