/** Unit tests for parsing and summarising api-linter JSON reports. */

import { describe, expect, test } from "bun:test";
import { countProblems, parseReport } from "../src/report.ts";

/** A representative slice of real `--output-format json` output. */
const SAMPLE_JSON = JSON.stringify([
  {
    file_path: "sample.proto",
    problems: [
      {
        message: "Field `Name` must use lower_snake_case.",
        suggestion: "name",
        location: {
          start_position: { line_number: 5, column_number: 10 },
          end_position: { line_number: 5, column_number: 13 },
          path: "sample.proto",
        },
        rule_id: "core::0140::lower-snake",
        rule_doc_uri: "https://linter.aip.dev/140/lower-snake",
      },
      {
        message: 'Missing comment over "book".',
        location: {
          start_position: { line_number: 4, column_number: 9 },
          end_position: { line_number: 4, column_number: 12 },
          path: "sample.proto",
        },
        rule_id: "core::0192::has-comments",
        rule_doc_uri: "https://linter.aip.dev/192/has-comments",
      },
    ],
  },
  { file_path: "clean.proto", problems: [] },
]);

describe("parseReport", () => {
  test("parses a well-formed report", () => {
    const report = parseReport(SAMPLE_JSON);
    expect(report).toHaveLength(2);
    expect(report[0]?.problems[0]?.rule_id).toBe("core::0140::lower-snake");
  });

  test("treats empty output as an empty report", () => {
    expect(parseReport("")).toEqual([]);
    expect(parseReport("   \n ")).toEqual([]);
  });

  test("throws when the JSON root is not an array", () => {
    expect(() => parseReport('{"file_path":"x"}')).toThrow(/not an array/);
  });

  test("throws on malformed JSON", () => {
    expect(() => parseReport("[not json")).toThrow();
  });
});

describe("countProblems", () => {
  test("sums problems across all files", () => {
    expect(countProblems(parseReport(SAMPLE_JSON))).toBe(2);
  });

  test("returns zero for an empty report", () => {
    expect(countProblems([])).toBe(0);
  });
});
