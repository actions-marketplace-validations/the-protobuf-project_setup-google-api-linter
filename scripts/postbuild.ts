/**
 * Post-processes the bundled `dist/index.js` to make it reproducible.
 *
 * Bun's bundler inlines CommonJS `__dirname`/`__filename` as absolute paths of
 * the build machine (for example
 * `"/Users/me/repo/node_modules/@actions/tool-cache/lib"`). That bakes a
 * machine-specific path into the committed bundle, so a rebuild on another
 * machine (such as CI) produces a different file and the "dist up to date"
 * check fails.
 *
 * This step rewrites any absolute path that points inside `node_modules` to a
 * repository-relative one, which is identical regardless of where the bundle
 * was built.
 */

import { readFileSync, writeFileSync } from "node:fs";

/** The bundle to rewrite. */
const BUNDLE = "dist/index.js";

/**
 * Replace absolute `.../node_modules/…` string literals with relative ones.
 *
 * @param code - The bundle source.
 * @returns The bundle source with machine-specific prefixes removed.
 */
function stripAbsolutePaths(code: string): string {
  // Match a double-quoted literal that contains an absolute prefix ending just
  // before `node_modules/`, and drop everything up to and including that prefix.
  return code.replace(/"[^"\n]*\/node_modules\//g, '"node_modules/');
}

const original = readFileSync(BUNDLE, "utf8");
const rewritten = stripAbsolutePaths(original);
if (rewritten !== original) {
  writeFileSync(BUNDLE, rewritten);
}
