# Setup Google API Linter

A GitHub Action that installs and runs the
[Google AIP **api-linter**](https://github.com/googleapis/api-linter) against
your Protocol Buffer files. It downloads a pinned (or the latest) linter
release, lints your protos, and surfaces the results as inline annotations, a
job-summary table, action outputs, and an optional report file.

- ✅ Installs any published `api-linter` version (or resolves `latest`)
- ✅ Caches the binary across runs via the Actions tool cache
- ✅ Inline PR annotations for every rule violation
- ✅ Job-summary table with links to each AIP rule
- ✅ Optional machine-readable report (`json`, `yaml`, `github`, `summary`)
- ✅ Supports config files, import paths, rule toggles and descriptor sets
- ✅ Written entirely in documented TypeScript

## Quick start

```yaml
name: API lint
on: [pull_request]
permissions:
  contents: read
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: oh-tarnished/setup-google-api-linter@v1
        with:
          paths: proto/**/*.proto
```

By default the action lints `**/*.proto`, installs the latest linter, annotates
each problem, writes a job summary, and fails the job if any problem is found.

## Inputs

| Input                     | Default        | Description                                                            |
| ------------------------- | -------------- | --------------------------------------------------------------------- |
| `version`                 | `latest`       | api-linter version to install (e.g. `1.69.2`, `v1.69.2`) or `latest`. |
| `paths`                   | `**/*.proto`   | Newline/comma-separated globs of proto files to lint.                 |
| `config`                  | `""`           | Path to an api-linter config file (YAML or JSON).                     |
| `proto-paths`             | `""`           | Newline/comma-separated import search dirs, passed as `-I`.           |
| `enable-rules`            | `""`           | Newline/comma-separated rule names to enable.                         |
| `disable-rules`           | `""`           | Newline/comma-separated rule names to disable.                        |
| `ignore-comment-disables` | `false`        | Ignore in-proto disable comments (strict enforcement).                |
| `descriptor-set-in`       | `""`           | Newline/comma-separated FileDescriptorSet files for imports.          |
| `skip-compilation`        | `false`        | Skip compilation and lint `descriptor-set-in` instead.                |
| `output-format`           | `json`         | Report file format: `json`, `yaml`, `github` or `summary`.            |
| `output-path`             | `""`           | Where to write the report. When set, exposed via `results-path`.      |
| `annotate`                | `true`         | Emit inline GitHub annotations for each problem.                      |
| `job-summary`             | `true`         | Write a results table to the job summary.                             |
| `fail-on-error`           | `true`         | Fail the job when one or more problems are reported.                  |
| `working-directory`       | `.`            | Directory to resolve paths and run the linter from.                   |
| `github-token`            | `github.token` | Token used when resolving `latest` and downloading the release.       |

## Outputs

| Output          | Description                                                       |
| --------------- | ---------------------------------------------------------------- |
| `version`       | The concrete api-linter version that was installed.              |
| `problem-count` | Total number of problems reported across all files.              |
| `results-path`  | Absolute path to the written report, when `output-path` was set. |

## How results are surfaced

- **Annotations** — each problem becomes an inline error annotation on the
  relevant proto line (disable with `annotate: false`).
- **Job summary** — a table of `File · Line · Rule · Message`, with each rule
  linking to its page on [linter.aip.dev](https://linter.aip.dev)
  (disable with `job-summary: false`).
- **Report file** — set `output-path` to write the full report in
  `output-format` for archiving or downstream tooling.
- **Outputs** — read `problem-count`, `version` and `results-path` in later
  steps.

See [`docs/examples.md`](docs/examples.md) for config files, import paths, rule
overrides, descriptor sets, artifact uploads and more.

## Supported runners

api-linter publishes binaries for these platforms, all of which this action
supports:

| OS      | Architecture | GitHub-hosted runner |
| ------- | ------------ | -------------------- |
| Linux   | amd64, arm   | `ubuntu-latest`      |
| macOS   | amd64, arm64 | `macos-latest`       |
| Windows | amd64        | `windows-latest`     |

Linux `arm64` is not published upstream and is therefore unsupported; the
action fails with a clear message on unsupported hosts.

## Notes

- **Versioning** — reference a released major tag (`@v1`) for stability, or a
  full SHA for maximum pinning.
- **No auto-fix** — api-linter is a linter, not a formatter, so it does not
  rewrite protos. This action surfaces problems (including any `suggestion`
  fields) and can persist a report; applying changes is left to you.

## Development

This project uses [Bun](https://bun.com).

```bash
bun install        # install dependencies
bun run lint       # biome lint + format check
bun run typecheck  # tsc --noEmit
bun test           # unit tests
bun run build      # bundle to dist/index.js
bun run all        # everything above, in order
```

The action runs the bundled `dist/index.js`, so **commit `dist/` after every
change to `src/`**. CI (`.github/workflows/ci.yml`) fails if the committed
bundle is stale. Every source file is kept under 200 lines.

## License

[MIT](LICENSE) © oh-tarnished

`api-linter` is a Google project distributed under the Apache-2.0 license; this
action merely installs and invokes it.
