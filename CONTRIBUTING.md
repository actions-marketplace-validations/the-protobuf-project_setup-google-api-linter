# Contributing

Thank you for your interest in improving **Setup Google API Linter**.
Contributions of all kinds are welcome: bug reports, documentation, and code.

## Table of contents

The list below links to each section of this guide so you can jump straight to
what you need.

- [Code of conduct](#code-of-conduct)
- [Prerequisites](#prerequisites)
- [Getting started](#getting-started)
- [Project layout](#project-layout)
- [Development workflow](#development-workflow)
- [Coding standards](#coding-standards)
- [Committing the bundle](#committing-the-bundle)
- [Opening a pull request](#opening-a-pull-request)
- [Dependency updates](#dependency-updates)
- [Releasing](#releasing)
- [Reporting issues](#reporting-issues)

## Code of conduct

Be respectful and constructive. By participating you agree to keep discussion
civil and welcoming for everyone.

## Prerequisites

- [Bun](https://bun.com) `>= 1.3`
- Git

This project uses Bun for everything (runtime, package manager, test runner and
bundler). You do not need Node.js or npm to develop it, though the action runs
under Node on GitHub-hosted runners.

## Getting started

```bash
git clone https://github.com/the-protobuf-project/setup-google-api-linter.git
cd setup-google-api-linter
bun install
```

## Project layout

| Path                    | Purpose                                             |
| ----------------------- | --------------------------------------------------- |
| `action.yml`            | Action metadata consumed by the Marketplace.        |
| `src/`                  | TypeScript source, one small module per concern.    |
| `tests/`                | `bun test` unit tests.                              |
| `dist/`                 | Bundled `index.js` the runner executes (committed). |
| `scripts/`              | Build and metadata checks run by Bun.               |
| `docs/`, `examples/`    | Documentation and example workflows.                |
| `.github/workflows/`    | CI and self-test workflows.                         |

## Development workflow

Run the full check suite before pushing:

```bash
bun run all
```

That runs, in order:

```bash
bun run lint            # Biome lint + format check
bun run typecheck       # tsc --noEmit
bun run check:metadata  # action.yml satisfies the Marketplace rules
bun test                # unit tests
bun run build           # bundle to dist/index.js
```

Autofix lint and formatting problems with `bun run lint:fix`.

The golden test (`tests/golden.test.ts`) exercises the real buf → api-linter
pipeline and is skipped unless `buf` is on `PATH` and `api-linter` is on `PATH`
or given via `API_LINTER_BIN`. The `golden` CI job installs both and runs it.

## Coding standards

- **TypeScript only.** Every value, parameter and return type is typed; `any`
  is disallowed by Biome.
- **Document everything.** Public functions, types and inputs carry TSDoc
  comments.
- **Keep files small.** Every file must stay **under 200 lines**; split a module
  before it grows past that.
- Follow the existing Biome formatting (2-space indent, double quotes, trailing
  commas). Do not hand-format; let `bun run lint:fix` do it.

## Committing the bundle

GitHub runs the compiled `dist/index.js` directly, so it must be committed.
After any change under `src/`, run `bun run build` and commit the updated
`dist/`. CI fails if the committed bundle is out of date.

## Opening a pull request

1. Fork the repository and create a topic branch.
2. Make your change, including tests and documentation.
3. Ensure `bun run all` passes and `dist/` is rebuilt and committed.
4. Open a pull request describing the change and the motivation.
5. The CI and self-test workflows must pass before review.

## Dependency updates

Dependabot opens the bump pull requests (`.github/dependabot.yml`: npm and
GitHub Actions, weekly, with `@actions/*` and the dev dependencies grouped).
The `Dependabot auto-merge` workflow
(`.github/workflows/dependabot-auto-merge.yaml`) then lands the safe ones:

- A bump to a bundled `@actions/*` dependency leaves the committed
  `dist/index.js` stale, which the CI bundle check rejects. The workflow
  rebuilds the bundle and pushes it to Dependabot's branch.
- Patch and minor updates are approved and queued with GitHub's auto-merge, so
  GitHub merges them once every required status check passes.
- Major updates get a comment and are left for a human.

This relies on two repository settings. Without them the workflow either errors
or merges without waiting, so keep both in place:

- **Allow auto-merge** must be enabled (Settings > General > Pull Requests).
- **`main` must be protected with the CI jobs as required status checks**
  (`Lint`, `Check action.yml`, `Typecheck`, `Test`, `Build & verify bundle`,
  `Pull Google APIs and lint the example`, `Lint the example proto`).
  Auto-merge waits only on required checks; with none configured, a queued pull
  request merges immediately.

Optionally add a `BUNDLE_PUSH_TOKEN` **Dependabot** secret (Settings > Secrets
and variables > Dependabot) holding a fine-grained PAT or GitHub App token with
content write access. Pushes made with the default `GITHUB_TOKEN` do not
re-trigger workflows, so a rebuilt bundle would land on a head commit CI never
runs against. With the secret, the push starts a fresh run that queues the
merge; without it, the workflow fails with instructions to re-run the checks by
hand.

## Releasing

A release is cut by pushing a tag. The `Release` workflow
(`.github/workflows/release.yaml`) does the rest.

1. Bump `version` in `package.json` on `main` and commit it.
2. Confirm `bun run all` passes and the rebuilt `dist/` is committed.
3. Tag that commit and push the tag:

```bash
git tag v1.1.0
git push origin v1.1.0
```

The workflow re-verifies the tagged commit before publishing anything: the tag
must match `package.json`, `action.yml` must be publishable, lint, typecheck and
tests must pass, and `dist/` must match the tagged source. Only then does it
create the GitHub Release with generated notes and move the floating major tag
(`v1`) onto the released commit, so `@v1` keeps resolving to the newest 1.x.

A tag with a suffix, such as `v1.1.0-rc.1`, is published as a prerelease and
leaves the major tag alone.

### Publishing to the Marketplace

Listing the action on the Marketplace is a one-time manual step: GitHub only
offers the opt-in from the release page, so no workflow can do it. The
organisation needs two-factor authentication enabled and must accept the
Marketplace Developer Agreement when prompted.

1. Open the release the workflow created and choose **Edit**.
2. Tick **Publish this Action to the GitHub Marketplace**.
3. Accept the agreement if asked, then update the release.

Later releases are listed automatically. `bun run check:metadata` enforces the
rules that opt-in validates — a description under 125 characters, a valid
branding icon and colour, and a description on every input and output — so the
form should accept the listing unchanged.

## Reporting issues

Open an issue at
<https://github.com/the-protobuf-project/setup-google-api-linter/issues> with a
clear description, the action version, and a minimal reproduction where
possible.
