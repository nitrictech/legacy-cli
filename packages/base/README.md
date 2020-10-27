# @cloudless/cli

CLI tool for cloudless applications

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@cloudless/cli.svg)](https://npmjs.org/package/@cloudless/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@cloudless/cli.svg)](https://npmjs.org/package/@cloudless/cli)
[![License](https://img.shields.io/npm/l/@cloudless/cli.svg)](https://github.com/packages/cli/blob/master/package.json)

<!-- toc -->

- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @cloudless/cli
$ cloudless COMMAND
running command...
$ cloudless (-v|--version|version)
@cloudless/cli/0.0.0 linux-x64 node-v12.13.1
$ cloudless --help [COMMAND]
USAGE
  $ cloudless COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`cloudless hello [FILE]`](#cloudless-hello-file)
- [`cloudless help [COMMAND]`](#cloudless-help-command)

## `cloudless hello [FILE]`

describe the command here

```
USAGE
  $ cloudless hello [FILE]

OPTIONS
  -f, --force
  -h, --help       show CLI help
  -n, --name=name  name to print

EXAMPLE
  $ cloudless hello
  hello world from ./src/hello.ts!
```

_See code: [src/commands/hello.ts](https://github.com/packages/cli/blob/v0.0.0/src/commands/hello.ts)_

## `cloudless help [COMMAND]`

display help for cloudless

```
USAGE
  $ cloudless help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.1.0/src/commands/help.ts)_

<!-- commandsstop -->
