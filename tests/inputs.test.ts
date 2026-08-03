/**
 * Unit tests for input parsing. `@actions/core` reads inputs from `INPUT_*`
 * environment variables, so the tests populate those directly.
 */

import { afterEach, describe, expect, test } from "bun:test";
import { getInputs } from "../src/inputs.ts";

/** Boolean inputs must always be set, since core.getBooleanInput has no default. */
const BOOLEAN_DEFAULTS: Record<string, string> = {
  "IGNORE-COMMENT-DISABLES": "false",
  "SKIP-COMPILATION": "false",
  ANNOTATE: "true",
  "JOB-SUMMARY": "true",
  "FAIL-ON-ERROR": "true",
};

/** Track which INPUT_* keys a test set so they can be cleared afterwards. */
const touchedKeys = new Set<string>();

/** Set the given inputs (plus boolean defaults) as INPUT_* env vars. */
function setInputs(overrides: Record<string, string>): void {
  const values = { ...BOOLEAN_DEFAULTS, ...overrides };
  for (const [name, value] of Object.entries(values)) {
    const key = `INPUT_${name}`;
    process.env[key] = value;
    touchedKeys.add(key);
  }
}

afterEach(() => {
  for (const key of touchedKeys) {
    delete process.env[key];
  }
  touchedKeys.clear();
});

describe("getInputs", () => {
  test("applies defaults for an otherwise-empty configuration", () => {
    setInputs({});
    const inputs = getInputs();
    expect(inputs.version).toBe("latest");
    expect(inputs.paths).toEqual(["**/*.proto"]);
    expect(inputs.outputFormat).toBe("json");
    expect(inputs.workingDirectory).toBe(".");
    expect(inputs.failOnError).toBe(true);
  });

  test("splits list inputs on both newlines and commas", () => {
    setInputs({
      "ENABLE-RULES": "core::0131\ncore::0132, core::0133",
      "PROTO-PATHS": "proto, third_party",
    });
    const inputs = getInputs();
    expect(inputs.enableRules).toEqual(["core::0131", "core::0132", "core::0133"]);
    expect(inputs.protoPaths).toEqual(["proto", "third_party"]);
  });

  test("rejects an unsupported output-format", () => {
    setInputs({ "OUTPUT-FORMAT": "xml" });
    expect(() => getInputs()).toThrow(/Invalid output-format/);
  });

  test("requires descriptor-set-in when skip-compilation is enabled", () => {
    setInputs({ "SKIP-COMPILATION": "true" });
    expect(() => getInputs()).toThrow(/no descriptor-set-in/);
  });
});
