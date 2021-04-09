# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.24](https://github.com/nitrictech/cli/compare/v0.0.23...v0.0.24) (2021-04-09)


### Bug Fixes

* Fix awaits on dockerode image pulls. ([af1b111](https://github.com/nitrictech/cli/commit/af1b11190e2a63fe8d25b28845a84f9ee0ec8bed))

### [0.0.23](https://github.com/nitrictech/cli/compare/v0.0.22...v0.0.23) (2021-04-06)


### Bug Fixes

* add default dir for deploy:aws cmd ([5e309f5](https://github.com/nitrictech/cli/commit/5e309f5714d6ae25d31ab6aed1e44144a945ad0b))
* deployment failures due to pulumi version ([be5aa0a](https://github.com/nitrictech/cli/commit/be5aa0ae58a87eb9e2db55b9e89199f786df5b4c))
* remove unused import ([152d586](https://github.com/nitrictech/cli/commit/152d5862572c34891646d26ada6fa6fc0bc7f5a3))
* Update gcp and aws pulumi dependencies. ([c28e187](https://github.com/nitrictech/cli/commit/c28e187be447c2fad61550cbbd89a1ff2f34fa1c))
* Update pulumi. ([2cbe552](https://github.com/nitrictech/cli/commit/2cbe552f604d7210b87dd0d5fdc34382e68700a6))

### [0.0.22](https://github.com/nitrictech/cli/compare/v0.0.21...v0.0.22) (2021-04-01)


### Bug Fixes

* add provider scope to down commands ([ecee9be](https://github.com/nitrictech/cli/commit/ecee9be14bd419a79b923fa0108e7947910339db))

### [0.0.21](https://github.com/nitrictech/cli/compare/v0.0.20...v0.0.21) (2021-04-01)


### Bug Fixes

* Add missing phantom dependencies. ([794fbe9](https://github.com/nitrictech/cli/commit/794fbe978df54d95749b8a9eac9401cf541eeb6d))

### [0.0.20](https://github.com/nitrictech/cli/compare/v0.0.19...v0.0.20) (2021-04-01)

### [0.0.19](https://github.com/nitrictech/cli/compare/v0.0.18...v0.0.19) (2021-04-01)


### Features

* Add deployment logging for AWS, GCP & Azure. ([798fb43](https://github.com/nitrictech/cli/commit/798fb43943c86d79211ae4eff08a68b0dcaaeccf))
* **common:** Add utilities for stack operation logging. ([c5e219d](https://github.com/nitrictech/cli/commit/c5e219d3e2c8cb260b237a2bdb4aa9ecad2725a1))


### Bug Fixes

* Fix missing common dependencies. ([6b8b305](https://github.com/nitrictech/cli/commit/6b8b305bd9f054bc6af43356a684c50c32a3c551))

### [0.0.18](https://github.com/nitrictech/cli/compare/v0.0.17...v0.0.18) (2021-03-30)


### Bug Fixes

* Scope stack names to providers for now. ([cc7de2a](https://github.com/nitrictech/cli/commit/cc7de2a5e319d353e14fa525d2d1e4ea183c97d6))

### [0.0.17](https://github.com/nitrictech/cli/compare/v0.0.16...v0.0.17) (2021-03-30)


### Features

* Add a quick link via the cli output. ([bb68b6d](https://github.com/nitrictech/cli/commit/bb68b6da86719355f0ef6fce26c1f81424edc216))
* Add custom type provider for cloud scheduler. ([6226e0b](https://github.com/nitrictech/cli/commit/6226e0b0fb058dcede2511f37aa29922900a3f5e))
* Add doctor:gcp command and tasks to install GCP pulumi plugin. ([528dab2](https://github.com/nitrictech/cli/commit/528dab26e8523d25de746cc05d8407413f3f7aeb))
* Add static site building before deploy. ([02541e1](https://github.com/nitrictech/cli/commit/02541e1ceac2328d61811d4eb3b7a94f3277984a))
* Add static site definition to NitricStack. ([530c2d6](https://github.com/nitrictech/cli/commit/530c2d6feaa59b901e6d4adb1f753065d207fc23))
* Add template for creating an event bus rule for scheduled events. ([5f70bf9](https://github.com/nitrictech/cli/commit/5f70bf9e5b0e50b9a911939217e9a5ca670a100c))
* add working aws api gateway deployment ([5b170d4](https://github.com/nitrictech/cli/commit/5b170d4a8ebe848c624f59cb83d0ecf7ca5feb7c))
* Connect up new site creation and entrypoint creation functions. ([628d58c](https://github.com/nitrictech/cli/commit/628d58ca547a0037f537d9dfaaf6f2d041fdc89c))
* HTTPs support for gcloud load balancer. ([2450d73](https://github.com/nitrictech/cli/commit/2450d731d1d990d390e672e8e96079a6afb349e7))
* Preliminary local run task, for nitric entrypoints. ([a6857de](https://github.com/nitrictech/cli/commit/a6857de93ba68e069626052819e6bb70c005776b))
* WIP commands for template repository download/listing. ([60bba71](https://github.com/nitrictech/cli/commit/60bba716af151111e8c2b01777930c2cf2f7c1be))
* WIP doctor command to install pre-requisite software. ([f9bbf03](https://github.com/nitrictech/cli/commit/f9bbf03017739ec9cc81ac77f1cc57c9482583fc))
* WIP entrypoints for AWS cloudfront/s3 buckets. ([68db125](https://github.com/nitrictech/cli/commit/68db125f46e08dbfe125462f4e4917916b4c63cc))
* WIP GCP entrypoints support. ([ebb90b6](https://github.com/nitrictech/cli/commit/ebb90b675b638b34633f232c12ff37e014e38fdb))
* WIP google pulumi implementation. ([2a8a823](https://github.com/nitrictech/cli/commit/2a8a823ef8034fffe120b638f28ad91882753bfa))
* WIP implementation of schedule deployment on google cloud. ([595821c](https://github.com/nitrictech/cli/commit/595821c532ef7b22eb3c7ba24a41df7ba43a6977))
* Working API/Site deploy for AWS. ([5edd67f](https://github.com/nitrictech/cli/commit/5edd67ff188f6546d5b02eab4fcb93ffcb230987))
* Working Azure AppService deployment for nitric functions. ([0ea6237](https://github.com/nitrictech/cli/commit/0ea62376df237d1b01ba2265e65eb2533ee7931a))
* Working GCP pulumi deployment. ([7ceb282](https://github.com/nitrictech/cli/commit/7ceb282b77b04f4191dcf2064ea271bf6c28d690))
* Working local entrypoints deployment. ([9855ce1](https://github.com/nitrictech/cli/commit/9855ce15ab8213b978c2a3871d517aa92723ae99))
* Working static site deployment. ([7a45fd4](https://github.com/nitrictech/cli/commit/7a45fd4a052617eda1eb20f506a1942a12614dfe))
* **azure:** Wrap up prototype deployment scripts for azure. ([8219a01](https://github.com/nitrictech/cli/commit/8219a01a324d1497dc0cce17c8f1d5a71e3db78f))
* **cli:** WIP GCP API Gateway implementation. ([e5019d8](https://github.com/nitrictech/cli/commit/e5019d897f0f8f5d4ec2c7135de15ff42dee9d95))
* **cli-common:** Add API definitions for NitricStack ([a76ed94](https://github.com/nitrictech/cli/commit/a76ed94273b8292a96f133280ce16a3fca78e310))
* **cli/gcp:** Working GCP APIGateway Deployment. ([3d727c6](https://github.com/nitrictech/cli/commit/3d727c633a67916c630ecbe39f6de1caafdb1ef9))
* **gcp:** Working inline docker build/push ([0c75d18](https://github.com/nitrictech/cli/commit/0c75d18a7d7e07ae3de8e36dd81efeb76d02daf1))
* **run:** Add API port mapping to output. ([14ea3cb](https://github.com/nitrictech/cli/commit/14ea3cbeffd64767d96ae2e9e76c108bd2c783f1))
* **run:** WIP local API gateway. ([2ca0fee](https://github.com/nitrictech/cli/commit/2ca0fee8bf062a5c2ec03a988b2b200e5a729148))
* **run:** Working API gateway startup on run. ([2b7f63e](https://github.com/nitrictech/cli/commit/2b7f63e4c1ce234ecf0d4e434ee0d3f321148233))
* Working API gateway deployment. ([61ce682](https://github.com/nitrictech/cli/commit/61ce6823f2a276622f5cf88227a983f57461ea91))
* Working schedule deployments for GCP. ([050711b](https://github.com/nitrictech/cli/commit/050711bd9588b1ac5f5640609c7313a3f8f5b042))


### Bug Fixes

* add check for valid project names in make:project ([c2ee442](https://github.com/nitrictech/cli/commit/c2ee4421e32913f3cdad0fbdd6d7b9659876d8fe))
* build task splits repo and template names to find each individually ([480622d](https://github.com/nitrictech/cli/commit/480622dc50708a1866c020cc565c37b4eb579e19))
* check if at least one repo is available when listing templates ([885980a](https://github.com/nitrictech/cli/commit/885980a034a02c82ab2ebc7a66655b0b934acc59))
* clear container start timeout on successful start ([c4c997b](https://github.com/nitrictech/cli/commit/c4c997bb8a6314224b9fd25dbec539f394c9ef7e))
* copy the full template directory during build staging ([f32fcad](https://github.com/nitrictech/cli/commit/f32fcad284e6e05848171abd2be9ccf50775dd8e))
* correct make project task classname ([3532329](https://github.com/nitrictech/cli/commit/35323296ca50494fc55fd46a72ef41ced0d29e11))
* delete placeholder create command ([86108a5](https://github.com/nitrictech/cli/commit/86108a5586e40a1bf1ee3428b9a4cc28d2994ea0))
* ignore legacy or superfluous template repo directories ([9b6390d](https://github.com/nitrictech/cli/commit/9b6390d19d7c84ed088d94563dfac496068070bb))
* improve handling of failing to set docker network ([77533e2](https://github.com/nitrictech/cli/commit/77533e2a3cb1ce14c972f588e56bd1f8d3390ae1))
* improve plugin load performance ([916f7a0](https://github.com/nitrictech/cli/commit/916f7a05ca25301cf4292edca9aee42c419aa907))
* make port optional for RunFunctionTask ([ad01135](https://github.com/nitrictech/cli/commit/ad01135dd7a03db5e502508cdfc2ac5a2707c981))
* minor issues in utils functions ([bbd68d5](https://github.com/nitrictech/cli/commit/bbd68d5c5187461e56a747724ccecfcfa12f0551))
* move project name validation before prompts ([dbf12bc](https://github.com/nitrictech/cli/commit/dbf12bc88cfc8919a151692bfa9080a7b46f1aac))
* passthrough stdio for doctor installs ([8e7cf4a](https://github.com/nitrictech/cli/commit/8e7cf4ac7f3c7c08eed7e2126ec5acc9807a4c01))
* set default example func name if none provide for new project ([e7c8342](https://github.com/nitrictech/cli/commit/e7c8342da378d5c30ad04d11af186403538dc490))
* stop warning about default network when no custom network set ([cdba178](https://github.com/nitrictech/cli/commit/cdba17823605778d2d7394adb19fc57219ca2bba))
* typo in docker container hostconfig ([a6942c1](https://github.com/nitrictech/cli/commit/a6942c134b66c25b19f9ffa01d8f954ba0dc2244))

### [0.0.16](https://github.com/nitric-dev/cli/compare/v0.0.15...v0.0.16) (2020-12-20)

### Features

- Add --guided mode to the gcp:down command. ([b60eb51](https://github.com/nitric-dev/cli/commit/b60eb516f639d0ee6a32a30e586927e59161fe25))
- Add a --guided CLI mode for the gcp:deploy command. ([e05c795](https://github.com/nitric-dev/cli/commit/e05c795948128776b8ea8ad523b1f2872acfedfb))
- add container health check and scaling ([e8135c8](https://github.com/nitric-dev/cli/commit/e8135c829d641cade6da6513f3ff819e52b30454))
- Add optional for externally invokable, unauthenticated functions. ([61ee2d0](https://github.com/nitric-dev/cli/commit/61ee2d082b092a20bd135ce6b3744b6ca16f8c23))
- Add run container policy updates to allow unauthenticated access. ([b3de1a1](https://github.com/nitric-dev/cli/commit/b3de1a1acc8a4f5031625895936b2af5f8ffc1c4))
- basic aws deploy with load balancer ([bfe88d2](https://github.com/nitric-dev/cli/commit/bfe88d2cb71ae5a1fd48d64bc68af586af1af3bc))
- run functions on lambda with container ([20f6f61](https://github.com/nitric-dev/cli/commit/20f6f61b55d42f61615273dd5eaa7df8e25a0093))

### Bug Fixes

- improve topic name normalization ([c86d2e8](https://github.com/nitric-dev/cli/commit/c86d2e87d756fad9e2d672b7897e0d39aa96947f))
- incorrect topic property setting ([d23f9e0](https://github.com/nitric-dev/cli/commit/d23f9e0b387a205a311871d9252e08ead40ac161))

### [0.0.15](https://github.com/nitric-dev/cli/compare/v0.0.14...v0.0.15) (2020-11-26)

### Bug Fixes

- broken project make, due to new function make ([970253d](https://github.com/nitric-dev/cli/commit/970253df81442127bcbf0e79b4ca6ecbca8770b2))

### [0.0.14](https://github.com/nitric-dev/cli/compare/v0.0.13...v0.0.14) (2020-11-26)

### Bug Fixes

- catch error when no templates installed ([8f7ec46](https://github.com/nitric-dev/cli/commit/8f7ec46da220e8a9e2ae94db0fa7774b7085c1f5))

### [0.0.13](https://github.com/nitric-dev/cli/compare/v0.0.12...v0.0.13) (2020-11-26)

### Features

- add prompts for missing make:function args ([0e07682](https://github.com/nitric-dev/cli/commit/0e07682fff7eb413d6c1c3f34dfd58b37fda65b6))
- assign function ports by alphabetical name ([bce4ab5](https://github.com/nitric-dev/cli/commit/bce4ab54e3604dbbd278673545684df41e6bbd0c))
- auto detect function templates on make:project ([71fa07f](https://github.com/nitric-dev/cli/commit/71fa07fd8e5071394c9f14ffb72f9584cd754ae5))

### Bug Fixes

- Add try/finally to container stop/remove. ([cea0a7c](https://github.com/nitric-dev/cli/commit/cea0a7c734be284c94155d35c8258415cd1a7281))
- remove unused variable ([6cd1bef](https://github.com/nitric-dev/cli/commit/6cd1bef5d8a82540369c6eeb08d48fc3a9bc3d8c))

### [0.0.12](https://github.com/nitric-dev/cli/compare/v0.0.11...v0.0.12) (2020-11-20)

### [0.0.11](https://github.com/nitric-dev/cli/compare/v0.0.10...v0.0.11) (2020-11-20)

### Features

- add local dev volumes ([d17c4dc](https://github.com/nitric-dev/cli/commit/d17c4dc59f16ddbfbd8ab30d2328d2cf755b488a))
- add local run networking ([c461368](https://github.com/nitric-dev/cli/commit/c461368d89d05a6665399b3fcbddae27ded8a3e1))

### Bug Fixes

- add basic error handling to container run ([5523411](https://github.com/nitric-dev/cli/commit/552341126cd2d1d340f428189b1da3027dc20118))
- failing gcp plugin test ([5466225](https://github.com/nitric-dev/cli/commit/5466225bf6d6b4f11094c91a39b53035f0ed186c))
- handle image id better ([eefb510](https://github.com/nitric-dev/cli/commit/eefb510702e72610d5f2d50be088acbf3e37354b))
- remove gateway host requirement ([8a32e56](https://github.com/nitric-dev/cli/commit/8a32e567c1863b07131cf116cbde38269bf003a3))
- respect template .dockerignore. ([dcf03aa](https://github.com/nitric-dev/cli/commit/dcf03aa0ddbae2c57b03f755d33390ab9082fd10))

### [0.0.10](https://github.com/nitric-dev/cli/compare/v0.0.9...v0.0.10) (2020-11-19)

### [0.0.9](https://github.com/nitric-dev/cli/compare/v0.0.8...v0.0.9) (2020-10-29)

### Bug Fixes

- Fix incorrect MakeFunctionOpts key from refactor. ([990f2df](https://github.com/nitric-dev/cli/commit/990f2df085a8a1563f8a5cebbf2d3580ff7641f8))

### [0.0.8](https://github.com/nitric-dev/cli/compare/v0.0.7...v0.0.8) (2020-10-29)

### Features

- Allow forcing project creation if dir already exists. ([57d4b3f](https://github.com/nitric-dev/cli/commit/57d4b3f4a0aa2b6f0e084b97c26072dc5d9d1528))
- **cli:** Add a make:project functionality. ([f1c47f6](https://github.com/nitric-dev/cli/commit/f1c47f6a0f7f46c80aa696ffda3e732ae742e6d0))

### Bug Fixes

- improve command descriptions in cli ([17d9f01](https://github.com/nitric-dev/cli/commit/17d9f01e8eaee785462e89a4108fff21a44b0e8e))

### 0.0.7 (2020-10-28)

### Bug Fixes

- minor typing issue ([d6a5d20](https://github.com/nitric-dev/cli/commit/d6a5d203ae02e31a270b48d562788fab133328b6))
- type error in make function task ([1e83a7b](https://github.com/nitric-dev/cli/commit/1e83a7be57d11cd34fe5c148e9b20fd5e82cbf4a))
