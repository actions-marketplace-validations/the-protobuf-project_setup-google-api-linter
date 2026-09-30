/**
 * Validates `action.yml` against the rules the GitHub Marketplace enforces when
 * a release is published.
 *
 * The Marketplace rejects a listing at publish time — after the tag and release
 * already exist — so a metadata mistake is only discovered once it is awkward to
 * fix. Running these checks in CI moves that failure to the pull request.
 *
 * Checked here:
 *   - `name`, `description` and `author` are present and non-empty.
 *   - `description` is under 125 characters (the Marketplace limit).
 *   - `branding.color` is one of the eight colours GitHub accepts.
 *   - `branding.icon` is set and looks like an icon slug. GitHub validates the
 *     name itself against its own subset of the Feather icon set, which is not
 *     published in a machine-readable form, so only the shape is checked.
 *   - `runs.main` points at a file that exists (the committed bundle).
 *   - every input and output carries a description, since the Marketplace
 *     renders them on the listing.
 */

import { existsSync } from "node:fs";

/** The metadata file to validate. */
const METADATA = "action.yml";

/** Maximum `description` length the Marketplace accepts, exclusive. */
const MAX_DESCRIPTION_LENGTH = 125;

/** The branding colours GitHub accepts. */
const BRANDING_COLORS: readonly string[] = [
  "white",
  "yellow",
  "blue",
  "green",
  "orange",
  "red",
  "purple",
  "gray-dark",
];

/** The shape of `action.yml` this script inspects. */
interface ActionMetadata {
  name?: unknown;
  description?: unknown;
  author?: unknown;
  branding?: { icon?: unknown; color?: unknown };
  runs?: { using?: unknown; main?: unknown };
  inputs?: Record<string, { description?: unknown }>;
  outputs?: Record<string, { description?: unknown }>;
}

/**
 * Collect every Marketplace rule the metadata violates.
 *
 * @param action - The parsed `action.yml`.
 * @returns One human-readable message per violation; empty when the metadata is
 *   publishable.
 */
function findProblems(action: ActionMetadata): string[] {
  const problems: string[] = [];

  for (const field of ["name", "description", "author"] as const) {
    const value = action[field];
    if (typeof value !== "string" || value.trim() === "") {
      problems.push(`\`${field}\` is required and must be a non-empty string.`);
    }
  }

  const { description } = action;
  if (typeof description === "string" && description.length >= MAX_DESCRIPTION_LENGTH) {
    problems.push(
      `\`description\` is ${description.length} characters; the Marketplace ` +
        `requires fewer than ${MAX_DESCRIPTION_LENGTH}.`,
    );
  }

  const branding = action.branding ?? {};
  if (typeof branding.icon !== "string" || !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(branding.icon)) {
    problems.push("`branding.icon` must be a lower-case icon slug, for example `check-circle`.");
  }
  if (typeof branding.color !== "string" || !BRANDING_COLORS.includes(branding.color)) {
    problems.push(`\`branding.color\` must be one of: ${BRANDING_COLORS.join(", ")}.`);
  }

  const runs = action.runs ?? {};
  if (typeof runs.main !== "string" || runs.main === "") {
    problems.push("`runs.main` is required.");
  } else if (!existsSync(runs.main)) {
    problems.push(`\`runs.main\` points at ${runs.main}, which is not committed.`);
  }

  for (const [section, entries] of [
    ["input", action.inputs],
    ["output", action.outputs],
  ] as const) {
    for (const [key, entry] of Object.entries(entries ?? {})) {
      if (typeof entry?.description !== "string" || entry.description.trim() === "") {
        problems.push(`The \`${key}\` ${section} has no description.`);
      }
    }
  }

  return problems;
}

const action = Bun.YAML.parse(await Bun.file(METADATA).text()) as ActionMetadata;
const problems = findProblems(action);

if (problems.length > 0) {
  for (const problem of problems) {
    console.error(`::error file=${METADATA}::${problem}`);
  }
  console.error(`\n${METADATA} is not publishable: ${problems.length} problem(s).`);
  process.exit(1);
}

console.log(`${METADATA} satisfies the Marketplace metadata rules.`);
