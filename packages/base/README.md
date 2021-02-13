# @nitric/cli

CLI tool for nitric applications

[![oclif](https://img.shields.io/badge/cli-oclif-brightgreen.svg)](https://oclif.io)
[![Version](https://img.shields.io/npm/v/@nitric/cli.svg)](https://npmjs.org/package/@nitric/cli)
[![Downloads/week](https://img.shields.io/npm/dw/@nitric/cli.svg)](https://npmjs.org/package/@nitric/cli)
[![License](https://img.shields.io/npm/l/@nitric/cli.svg)](https://github.com/packages/cli/blob/master/package.json)

<!-- toc -->

- [@nitric/cli](#nitriccli)
- [Usage](#usage)
- [Commands](#commands)
<!-- tocstop -->

# Usage

<!-- usage -->

```sh-session
$ npm install -g @nitric/cli
$ nitric COMMAND
running command...
$ nitric (-v|--version|version)
@nitric/cli/0.0.16 linux-x64 node-v12.13.1
$ nitric --help [COMMAND]
USAGE
  $ nitric COMMAND
...
```

<!-- usagestop -->

# Commands

<!-- commands -->

- [`nitric build [DIRECTORY]`](#nitric-build-directory)
- [`nitric create [NAME]`](#nitric-create-name)
- [`nitric help [COMMAND]`](#nitric-help-command)
- [`nitric make:function [TEMPLATE] [NAME]`](#nitric-makefunction-template-name)
- [`nitric make:project NAME`](#nitric-makeproject-name)
- [`nitric plugins`](#nitric-plugins)
- [`nitric plugins:install PLUGIN...`](#nitric-pluginsinstall-plugin)
- [`nitric plugins:link PLUGIN`](#nitric-pluginslink-plugin)
- [`nitric plugins:uninstall PLUGIN...`](#nitric-pluginsuninstall-plugin)
- [`nitric plugins:update`](#nitric-pluginsupdate)
- [`nitric run [DIRECTORY]`](#nitric-run-directory)

## `nitric build [DIRECTORY]`

Builds a project

```
USAGE
  $ nitric build [DIRECTORY]

OPTIONS
  -h, --help                      show CLI help
  -p, --provider=(local|gcp|aws)
  --file=file

EXAMPLE
  $ nitric build .
```

_See code: [src/commands/build.ts](https://github.com/packages/cli/blob/v0.0.16/src/commands/build.ts)_

## `nitric create [NAME]`

Creates a new project

```
USAGE
  $ nitric create [NAME]

OPTIONS
  -h, --help  show CLI help

EXAMPLE
  $ nitric create my-project
```

_See code: [src/commands/create.ts](https://github.com/packages/cli/blob/v0.0.16/src/commands/create.ts)_

## `nitric help [COMMAND]`

display help for nitric

```
USAGE
  $ nitric help [COMMAND]

ARGUMENTS
  COMMAND  command to show help for

OPTIONS
  --all  see all commands in CLI
```

_See code: [@oclif/plugin-help](https://github.com/oclif/plugin-help/blob/v3.2.0/src/commands/help.ts)_

## `nitric make:function [TEMPLATE] [NAME]`

Builds a nitric function

```
USAGE
  $ nitric make:function [TEMPLATE] [NAME]

ARGUMENTS
  TEMPLATE  Function template
  NAME      Function name

OPTIONS
  -d, --directory=directory  directory where the new function should be made
  -f, --file=file            nitric project YAML file
  -h, --help                 show CLI help

EXAMPLE
  $ nitric make:function .
```

_See code: [src/commands/make/function.ts](https://github.com/packages/cli/blob/v0.0.16/src/commands/make/function.ts)_

## `nitric make:project NAME`

Creates a new Nitric project

```
USAGE
  $ nitric make:project NAME

ARGUMENTS
  NAME  the name of the new project to create

OPTIONS
  -h, --help  show CLI help
  --force

EXAMPLE
  $ nitric make:function .
```

_See code: [src/commands/make/project.ts](https://github.com/packages/cli/blob/v0.0.16/src/commands/make/project.ts)_

## `nitric plugins`

list installed plugins

```
USAGE
  $ nitric plugins

OPTIONS
  --core  show core plugins

EXAMPLE
  $ nitric plugins
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/index.ts)_

## `nitric plugins:install PLUGIN...`

installs a plugin into the CLI

```
USAGE
  $ nitric plugins:install PLUGIN...

ARGUMENTS
  PLUGIN  plugin to install

OPTIONS
  -f, --force    yarn install with force flag
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Can be installed from npm or a git url.

  Installation of a user-installed plugin will override a core plugin.

  e.g. If you have a core plugin that has a 'hello' command, installing a user-installed plugin with a 'hello' command
  will override the core plugin implementation. This is useful if a user needs to update core plugin functionality in
  the CLI without the need to patch and update the whole CLI.

ALIASES
  $ nitric plugins:add

EXAMPLES
  $ nitric plugins:install myplugin
  $ nitric plugins:install https://github.com/someuser/someplugin
  $ nitric plugins:install someuser/someplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/install.ts)_

## `nitric plugins:link PLUGIN`

links a plugin into the CLI for development

```
USAGE
  $ nitric plugins:link PLUGIN

ARGUMENTS
  PATH  [default: .] path to plugin

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

DESCRIPTION
  Installation of a linked plugin will override a user-installed or core plugin.

  e.g. If you have a user-installed or core plugin that has a 'hello' command, installing a linked plugin with a 'hello'
  command will override the user-installed or core plugin implementation. This is useful for development work.

EXAMPLE
  $ nitric plugins:link myplugin
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/link.ts)_

## `nitric plugins:uninstall PLUGIN...`

removes a plugin from the CLI

```
USAGE
  $ nitric plugins:uninstall PLUGIN...

ARGUMENTS
  PLUGIN  plugin to uninstall

OPTIONS
  -h, --help     show CLI help
  -v, --verbose

ALIASES
  $ nitric plugins:unlink
  $ nitric plugins:remove
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/uninstall.ts)_

## `nitric plugins:update`

update installed plugins

```
USAGE
  $ nitric plugins:update

OPTIONS
  -h, --help     show CLI help
  -v, --verbose
```

_See code: [@oclif/plugin-plugins](https://github.com/oclif/plugin-plugins/blob/v1.9.1/src/commands/plugins/update.ts)_

## `nitric run [DIRECTORY]`

Builds and runs a project

```
USAGE
  $ nitric run [DIRECTORY]

OPTIONS
  -h, --help                      show CLI help
  -p, --provider=(local|gcp|aws)
  --file=file
  --portStart=portStart

EXAMPLE
  $ nitric run .
```

_See code: [src/commands/run.ts](https://github.com/packages/cli/blob/v0.0.16/src/commands/run.ts)_

<!-- commandsstop -->
