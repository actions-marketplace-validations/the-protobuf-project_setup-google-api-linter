# Usage examples

More complete workflows for **Setup Google API Linter**. See the
[README](../README.md) for the full input and output reference.

## Pin a specific linter version

```yaml
- uses: the-protobuf-project/setup-google-api-linter@v1
  with:
    version: "1.69.2"
    paths: proto/**/*.proto
```

## Use a configuration file

```yaml
- uses: the-protobuf-project/setup-google-api-linter@v1
  with:
    config: api-linter.yaml
    paths: proto/**/*.proto
```

## Import paths and rule overrides

```yaml
- uses: the-protobuf-project/setup-google-api-linter@v1
  with:
    paths: apis/**/*.proto
    proto-paths: |
      apis
      third_party/googleapis
    disable-rules: |
      core::0191::java-package
      core::0191::java-multiple-files
    enable-rules: core::0131
    ignore-comment-disables: true
```

## Write a report and upload it as an artifact

```yaml
- uses: the-protobuf-project/setup-google-api-linter@v1
  id: lint
  with:
    paths: proto/**/*.proto
    output-format: yaml
    output-path: api-linter-report.yaml
    fail-on-error: false

- uses: actions/upload-artifact@v4
  with:
    name: api-linter-report
    path: ${{ steps.lint.outputs.results-path }}
```

## Lint from a subdirectory

`working-directory` scopes both the glob resolution and the linter's own
working directory, so `paths` and `proto-paths` are relative to it.

```yaml
- uses: the-protobuf-project/setup-google-api-linter@v1
  with:
    working-directory: backend
    paths: proto/**/*.proto
```

## Report but do not fail the build

```yaml
- uses: the-protobuf-project/setup-google-api-linter@v1
  with:
    paths: proto/**/*.proto
    fail-on-error: false
```

## Resolve Buf Schema Registry dependencies

When your protos import types from a `buf.yaml` dependency (for example
`google/api/*`), enable `buf` so the action resolves them before linting.

```yaml
- uses: the-protobuf-project/setup-google-api-linter@v1
  with:
    buf: true
    working-directory: proto # directory that contains buf.yaml
    buf-input: "." # buf input to export, relative to working-directory
    paths: "**/*.proto"
```

buf is used from `PATH` if available (for example after
`bufbuild/buf-setup-action`), otherwise the action installs `buf-version`
(default `latest`) automatically.

## Lint a precompiled descriptor set

When protos are already compiled, skip compilation and lint the descriptor set
directly. `descriptor-set-in` must be built with `--include_source_info` and
`--include_imports`.

```yaml
- uses: the-protobuf-project/setup-google-api-linter@v1
  with:
    skip-compilation: true
    descriptor-set-in: build/descriptor.pb
```

## Gate a pull request and comment on failure

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
      - uses: the-protobuf-project/setup-google-api-linter@v1
        with:
          paths: proto/**/*.proto
```

Problems appear as inline annotations on the pull request diff and as a table
in the job summary.
