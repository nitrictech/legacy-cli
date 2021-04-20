<p align="center">
  <img src="./logo.png" alt="Nitric Logo"/>
</p>

# Nitric CLI

## Overview

Nitric provides a command-line interface (CLI) to assist with various tasks when building applications with Nitric. To view a list of available commands, you can call the CLI without specifying any subcommands or arguments:

```bash
nitric
```

Amoung other things, this will provide a list of `TOPICS` and `COMMANDS`. Commands are named CLI operations to perform tasks, such as `build` & `run`, these commands each have their own set of arguments and flags/options to control their behavior. Topics are collections of related commands, for example the `make` topic will contain subcommands for each resource that can be made, e.g. `make:function`.

### Help and Documentation

Each command is self documented and provides a "help" interface describing the usage, arguments and options for the command. Use the `help` command to view the help information for any other command:

```bash
# Example displaying help for the `build` command
nitric help build
```

### Plugins

In addition to the default commands provided by the base CLI, additional commands can be added via plugins. By default, provider specific commands e.g. `deploy:azure` are added via provider plugins, this ensures the size of the CLI remains smaller when only targeting a subset of providers, it also enables new providers or community supported providers to be added without changing the base CLI.

To view a list of currently installed plugins, run the `plugins` command directly:

```bash
nitric plugins
```

To install a new plugin use the `install` subcommand:

```bash
# Example of installing the default AWS provider plugin
nitric plugins:install @nitric/plugin-aws
```

To update plugins use the `update` subcommand:

```bash
nitric plugins:update
```

### Additional Documentation

To read the full documentation for the Nitric CLI or a specific plugin you can view the generated README.md in the CLI packages on Github.

- [Base CLI](./packages/base/README.md)
- [AWS Plugin](./packages/plugins/aws/README.md)
- [Azure Plugin](./packages/plugins/azure/README.md)
- [Google Cloud Plugin](./packages/plugins/gcp/README.md)
