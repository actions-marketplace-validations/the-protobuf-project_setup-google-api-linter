/**
 * Golden integration test: pull the Google APIs Buf dependency, lint the
 * AIP-compliant example proto, and assert the parsed report matches the
 * committed golden output.
 *
 * This exercises the real buf → api-linter pipeline, so it needs both tools
 * available. It is skipped automatically when they are not:
 *   - `buf` must be on `PATH`.
 *   - `api-linter` must be on `PATH`, or its path given via `API_LINTER_BIN`.
 * The dedicated `golden` CI job installs both and runs it for real.
 */

import { expect, test } from "bun:test";
import { existsSync, mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseReport } from "../src/report.ts";

/** Absolute path to the example Buf module (`examples/buf`), the module root. */
const FIXTURE_DIR = join(import.meta.dir, "..", "examples", "buf");
/** The proto file to lint, relative to the module root. */
const PROTO_FILE = "example/library/v1/library.proto";
/** The committed expected report. */
const GOLDEN_FILE = join(import.meta.dir, "golden", "library.golden.json");

/** Resolve the buf and api-linter executables, if both are available. */
function resolveTools(): { buf: string; linter: string } | null {
  const buf = Bun.which("buf");
  const linter = process.env.API_LINTER_BIN ?? Bun.which("api-linter");
  return buf && linter && existsSync(linter) ? { buf, linter } : null;
}

const tools = resolveTools();

test.skipIf(tools === null)(
  "golden: buf-resolved googleapis import lints the example API cleanly",
  async () => {
    if (tools === null) {
      return;
    }
    const vendor = mkdtempSync(join(tmpdir(), "golden-vendor-"));

    // Resolve the buf.yaml dependency (googleapis) onto disk.
    await Bun.$`${tools.buf} export . -o ${vendor}`.cwd(FIXTURE_DIR).quiet();

    // Lint the example proto with the vendored deps on the import path.
    const raw = await Bun.$`${tools.linter} -I ${vendor} --output-format json ${PROTO_FILE}`
      .cwd(FIXTURE_DIR)
      .quiet()
      .text();

    const actual = parseReport(raw);
    const golden = JSON.parse(readFileSync(GOLDEN_FILE, "utf8"));
    expect(actual).toEqual(golden);
  },
);
