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
| `docs/`, `examples/`    | Documentation and example workflows.                |
| `.github/workflows/`    | CI and self-test workflows.                         |

## Development workflow

Run the full check suite before pushing:

```bash
bun run all
```

That runs, in order:

```bash
bun run lint       # Biome lint + format check
bun run typecheck  # tsc --noEmit
bun test           # unit tests
bun run build      # bundle to dist/index.js
```

Autofix lint and formatting problems with `bun run lint:fix`.

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

## Reporting issues

Open an issue at
<https://github.com/the-protobuf-project/setup-google-api-linter/issues> with a
clear description, the action version, and a minimal reproduction where
possible.
