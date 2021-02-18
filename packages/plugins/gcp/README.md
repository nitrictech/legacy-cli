# @nitric/plugin-gcp

GCP plugin for Nitric

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@nitric/plugin-gcp.svg)](https://npmjs.org/package/@nitric/plugin-gcp)
[![Downloads/week](https://img.shields.io/npm/dw/@nitric/plugin-gcp.svg)](https://npmjs.org/package/@nitric/plugin-gcp)
[![License](https://img.shields.io/npm/l/@nitric/plugin-gcp.svg)](https://github.com/plugins/plugin-gcp/blob/master/package.json)

<!-- toc -->

- [@nitric/plugin-gcp](#nitricplugin-gcp)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @nitric/plugin-gcp
$ oclif-example COMMAND
running command...
$ oclif-example (-v|--version|version)
@nitric/plugin-gcp/0.0.16 darwin-x64 node-v15.0.1
$ oclif-example --help [COMMAND]
USAGE
  $ oclif-example COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`oclif-example deploy:gcp [DIR]`](#oclif-example-deploygcp-dir)
- [`oclif-example doctor:gcp`](#oclif-example-doctorgcp)
- [`oclif-example down:gcp [DIR]`](#oclif-example-downgcp-dir)
- [`oclif-example token:gcp`](#oclif-example-tokengcp)

## `oclif-example deploy:gcp [DIR]`

Deploy a Nitric application to Google Cloud Platform (GCP)

```
USAGE
  $ oclif-example deploy:gcp [DIR]

OPTIONS
  -f, --file=file
      [default: nitric.yaml]

  -h, --help
      show CLI help

  -p, --project=project
      GCP project ID to deploy to (default: locally configured account)

  -r,
  --region=(us-west1|us-central1|us-east1|us-east4|northamerica-northeast1|europe-west1|europe-west4|europe-north1|asia-
  southeast1|asia-east1|asia-northeast1|asia-northeast2|asia-southeast1)
      gcp region to deploy to

  --guided

EXAMPLE
  $ nitric deploy:gcp
```

_See code: [src/commands/deploy/gcp.ts](https://github.com/nitric-dev/cli/blob/v0.0.16/src/commands/deploy/gcp.ts)_

## `oclif-example doctor:gcp`

Checks environment for configuration for deployment to GCP

```
USAGE
  $ oclif-example doctor:gcp

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ nitric doctor:gcp
```

_See code: [src/commands/doctor/gcp.ts](https://github.com/nitric-dev/cli/blob/v0.0.16/src/commands/doctor/gcp.ts)_

## `oclif-example down:gcp [DIR]`

Delete a Nitric application on Google Cloud Platform (GCP)

```
USAGE
  $ oclif-example down:gcp [DIR]

OPTIONS
  -f, --file=file  [default: nitric.yaml]
  -h, --help       show CLI help
  --guided

EXAMPLE
  $ nitric down:gcp
```

_See code: [src/commands/down/gcp.ts](https://github.com/nitric-dev/cli/blob/v0.0.16/src/commands/down/gcp.ts)_

## `oclif-example token:gcp`

Deploy a Nitric application to Google Cloud Platform (GCP)

```
USAGE
  $ oclif-example token:gcp

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ nitric deploy:gcp . -p my-gcp-project
```

_See code: [src/commands/token/gcp.ts](https://github.com/nitric-dev/cli/blob/v0.0.16/src/commands/token/gcp.ts)_

<!-- commandsstop -->
