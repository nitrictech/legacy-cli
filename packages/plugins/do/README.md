# @nitric/plugin-do

Digital Ocean plugin for Nitric

> The Digital Ocean plugin is currently a work in progress and only implements a subset of the features available in Nitric
> Available Features are:
>
> - Service Deployments
> - Entrypoint mapping

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@nitric/plugin-do.svg)](https://npmjs.org/package/@nitric/plugin-do)
[![Downloads/week](https://img.shields.io/npm/dw/@nitric/plugin-do.svg)](https://npmjs.org/package/@nitric/plugin-do)
[![License](https://img.shields.io/npm/l/@nitric/plugin-do.svg)](https://github.com/plugins/plugin-do/blob/master/package.json)

<!-- toc -->

- [@nitric/plugin-do](#nitricplugin-do)
- [Usage](#usage)
- [Commands](#commands)
  - [`oclif-example deploy:do [DIR]`](#oclif-example-deploydo-dir)
  - [`oclif-example down:do [DIR]`](#oclif-example-downdo-dir)
  <!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @nitric/plugin-do
$ oclif-example COMMAND
running command...
$ oclif-example (-v|--version|version)
@nitric/plugin-do/0.0.30 linux-x64 node-v12.13.1
$ oclif-example --help [COMMAND]
USAGE
  $ oclif-example COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`oclif-example deploy:do [DIR]`](#oclif-example-deploydo-dir)
- [`oclif-example down:do [DIR]`](#oclif-example-downdo-dir)

## `oclif-example deploy:do [DIR]`

Deploy a Nitric application to Amazon Web Services (AWS)

```
USAGE
  $ oclif-example deploy:do [DIR]

OPTIONS
  -c, --containerRegistry=containerRegistry                                        Digital Ocean Container Registry to
                                                                                   deploy services to

  -f, --file=file                                                                  [default: nitric.yaml] Nitric
                                                                                   descriptor file location

  -h, --help                                                                       show CLI help

  -r, --region=(nyc1|sfo1|nyc2|ams2|sgp1|lon1|nyc3|ams3|fra1|tor1|sfo2|blr1|sfo3)  Digital Ocean Region to deploy to

EXAMPLE
  $ nitric deploy:aws . -a 123123123123 -r us-east-1
```

_See code: [src/commands/deploy/do.ts](https://github.com/nitric-dev/cli/blob/v0.0.30/src/commands/deploy/do.ts)_

## `oclif-example down:do [DIR]`

Delete a CloudFormation Stack on AWS that was deployed by \$ nitric deploy:aws

```
USAGE
  $ oclif-example down:do [DIR]

OPTIONS
  -f, --file=file
  -h, --help       show CLI help

EXAMPLE
  $ nitric down:aws
```

_See code: [src/commands/down/do.ts](https://github.com/nitric-dev/cli/blob/v0.0.30/src/commands/down/do.ts)_

<!-- commandsstop -->
