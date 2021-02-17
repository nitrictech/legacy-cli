# @nitric/plugin-aws

An AWS plugin for Nitric

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@nitric/plugin-aws.svg)](https://npmjs.org/package/@nitric/plugin-aws)
[![Downloads/week](https://img.shields.io/npm/dw/@nitric/plugin-aws.svg)](https://npmjs.org/package/@nitric/plugin-aws)
[![License](https://img.shields.io/npm/l/@nitric/plugin-aws.svg)](https://github.com//plugin-aws/blob/master/package.json)

<!-- toc -->

- [@nitric/plugin-aws](#nitricplugin-aws)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @nitric/plugin-aws
$ oclif-example COMMAND
running command...
$ oclif-example (-v|--version|version)
@nitric/plugin-aws/0.0.16 darwin-x64 node-v15.0.1
$ oclif-example --help [COMMAND]
USAGE
  $ oclif-example COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`oclif-example deploy:aws [DIR]`](#oclif-example-deployaws-dir)
- [`oclif-example doctor:aws`](#oclif-example-doctoraws)
- [`oclif-example down:aws [DIR]`](#oclif-example-downaws-dir)

## `oclif-example deploy:aws [DIR]`

Deploy a Nitric application to Amazon Web Services (AWS)

```
USAGE
  $ oclif-example deploy:aws [DIR]

OPTIONS
  -a, --account=account
      AWS Account ID to deploy to (default: locally configured account)

  -f, --file=file
      [default: nitric.yaml] Nitric descriptor file location

  -h, --help
      show CLI help

  -r,
  --region=(us-east-1|us-west-1|us-west-2|eu-west-1|eu-central-1|ap-southeast-1|ap-northeast-1|ap-southeast-2|ap-northea
  st-2|sa-east-1|cn-north-1|ap-south-1)
      AWS Region to deploy to

EXAMPLE
  $ nitric deploy:aws . -a 123123123123 -r us-east-1
```

_See code: [src/commands/deploy/aws.ts](https://github.com/nitric-dev/cli/blob/v0.0.16/src/commands/deploy/aws.ts)_

## `oclif-example doctor:aws`

Checks environment for configuration for deployment to AWS

```
USAGE
  $ oclif-example doctor:aws

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ nitric doctor:aws
```

_See code: [src/commands/doctor/aws.ts](https://github.com/nitric-dev/cli/blob/v0.0.16/src/commands/doctor/aws.ts)_

## `oclif-example down:aws [DIR]`

Delete a CloudFormation Stack on AWS that was deployed by \$ nitric deploy:aws

```
USAGE
  $ oclif-example down:aws [DIR]

OPTIONS
  -f, --file=file
  -h, --help                 show CLI help
  -r, --region=region        (required) AWS Region to tear down the stack in
  -s, --stackName=stackName  CloudFormation stack name, defaults to the name in the Nitric file if not provided.

EXAMPLE
  $ nitric down:aws . -s MyCloudFormationStack -r us-east-1
```

_See code: [src/commands/down/aws.ts](https://github.com/nitric-dev/cli/blob/v0.0.16/src/commands/down/aws.ts)_

<!-- commandsstop -->
