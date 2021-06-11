# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [0.0.62](https://github.com/nitrictech/cli/compare/v0.0.61...v0.0.62) (2021-06-11)

### [0.0.61](https://github.com/nitrictech/cli/compare/v0.0.60...v0.0.61) (2021-06-11)

### [0.0.60](https://github.com/nitrictech/cli/compare/v0.0.59...v0.0.60) (2021-06-11)

### [0.0.59](https://github.com/nitrictech/cli/compare/v0.0.58...v0.0.59) (2021-06-11)

### [0.0.58](https://github.com/nitrictech/cli/compare/v0.0.57...v0.0.58) (2021-06-10)


### Bug Fixes

* check that docker daemon is running for run and build commands ([4413c06](https://github.com/nitrictech/cli/commit/4413c060a3c844e1d3229420e7e7cf04d244532a))

### [0.0.57](https://github.com/nitrictech/cli/compare/v0.0.56...v0.0.57) (2021-06-10)

### [0.0.56](https://github.com/nitrictech/cli/compare/v0.0.55...v0.0.56) (2021-06-10)


### Bug Fixes

* check for git when installing template store ([f40610f](https://github.com/nitrictech/cli/commit/f40610f19b28d18f53ef7e4edab2cd659201a0a2))
* use correct slashes for windows powershell pulumi install ([ed30e33](https://github.com/nitrictech/cli/commit/ed30e338c37bcb1d5a8f53711c6b8ea2a571b4c6))

### [0.0.55](https://github.com/nitrictech/cli/compare/v0.0.54...v0.0.55) (2021-06-10)


### Bug Fixes

* improve error handling when Git is missing ([75502d9](https://github.com/nitrictech/cli/commit/75502d90ae258c0602843ce1c714e1c36a557bb0))
* remove literal path separator from repo file path ([fe77865](https://github.com/nitrictech/cli/commit/fe77865f7a255ddde1fecb854e6ccb393aca928b))

### [0.0.54](https://github.com/nitrictech/cli/compare/v0.0.53...v0.0.54) (2021-06-10)


### Bug Fixes

* add repo name to add repo task output ([7c76e2e](https://github.com/nitrictech/cli/commit/7c76e2e3856823c478b107fbd7369630f749792d))
* **make:project:** install the correct repos when they're missing ([7582808](https://github.com/nitrictech/cli/commit/75828088b0fd9008a70fb97ba768780bdac7f6a8))

### [0.0.53](https://github.com/nitrictech/cli/compare/v0.0.52...v0.0.53) (2021-06-09)


### Bug Fixes

* Scope stack deployments with stackname & provider. ([0889758](https://github.com/nitrictech/cli/commit/08897580607d1eb6cb9c2155396a934a40be145d))

### [0.0.52](https://github.com/nitrictech/cli/compare/v0.0.51...v0.0.52) (2021-06-08)


### Features

* Enable buildkit. ([a5b6e40](https://github.com/nitrictech/cli/commit/a5b6e40a56725272de3c8d9b009aadd96736fc6a))
* **common:** Add imageDigest as output for NitricServiceImage. ([7173e51](https://github.com/nitrictech/cli/commit/7173e519ff8b524e0d122e8a824c71f3dfe4067c))
* **plugin-do:** Add image digest as tag for service spec. ([55e6fad](https://github.com/nitrictech/cli/commit/55e6fade229939d247fc873fcbd0c2c2ac2ed9af))

### [0.0.51](https://github.com/nitrictech/cli/compare/v0.0.50...v0.0.51) (2021-06-08)


### Bug Fixes

* **common:** Remove superfluous makeDirectory in stack.pullTemplate ([80e8ab1](https://github.com/nitrictech/cli/commit/80e8ab16aa5871772c57228da8a3f1e24046311d))

### [0.0.50](https://github.com/nitrictech/cli/compare/v0.0.49...v0.0.50) (2021-06-07)


### Features

* Add certificate creation and validation for custom domains. ([c501dbe](https://github.com/nitrictech/cli/commit/c501dbe38be45dce5476841a0a4690dd74f1bc12))
* add custom domains support for DO entrypoints ([fde501c](https://github.com/nitrictech/cli/commit/fde501cca7edbb42e930db59812ecf7ea17f16dd))
* Add extensions for all stack items. ([87e4995](https://github.com/nitrictech/cli/commit/87e4995c295777758e5119e591dafd12f0f84fbb))
* Add generic extensions to resources classes. ([8950c13](https://github.com/nitrictech/cli/commit/8950c1376501f833cd98cbc34ef959fa0b86aebb))
* Add output results and cleanup to digital ocean deploy. ([bc7c123](https://github.com/nitrictech/cli/commit/bc7c123443014086c6d10b8e0e8024a0bcc4a54f))
* Add outputs and instructions for AWS dns configurations. ([e881ef2](https://github.com/nitrictech/cli/commit/e881ef2a947183caec2969de651b50f4d3a4b5d4))
* Make domains and paths extensible. ([65538c0](https://github.com/nitrictech/cli/commit/65538c02e0f7595b7e35089ab42ebe41cfc2dc9b))
* support multiple entrypoints for local run ([00ca5e4](https://github.com/nitrictech/cli/commit/00ca5e45bda76e616713a21a6338c5929575f3b4))
* support multiple entrypoints in gcp ([e0d5a9f](https://github.com/nitrictech/cli/commit/e0d5a9fbcb1873d6001f0d20f27ab0dbb51475cf))
* Update AWS and GCP entrypoint outputs. ([b976ab2](https://github.com/nitrictech/cli/commit/b976ab24b8d19f221b9eff8b9ec49cc1f6ff187a))
* Update aws entrypoints definitions. ([1169c9c](https://github.com/nitrictech/cli/commit/1169c9c95a145becbfc54056d28e309bd8627a0c))
* Update types to simplify domains. ([e57e4ae](https://github.com/nitrictech/cli/commit/e57e4aeee1378603657c98db9817c4579be79077))


### Bug Fixes

* add mistakenly removed imports ([ae6a3f8](https://github.com/nitrictech/cli/commit/ae6a3f8b25952105ac31bdcbcf515ba086526bec))
* **gcp:** Fix incorrect backend name. ([ab5ebe3](https://github.com/nitrictech/cli/commit/ab5ebe30e7febb08186c8e7f1d7d494721a55317))
* **gcp:** fix incorrect resource names. ([92999da](https://github.com/nitrictech/cli/commit/92999da09b8d44ce1d2bda82f8bfef74d9df9cb9))
* **gcp:** Fix non-default entrypoint normalization. ([b31594e](https://github.com/nitrictech/cli/commit/b31594eab8ddb1659c10dcf56fbdb2576ec4aa77))
* **gcp:** fix target filtering. ([e73bb50](https://github.com/nitrictech/cli/commit/e73bb50031abcceea90cf4f275fc993cba973dd0))
* **gcp:** Fix type error. ([64efe3e](https://github.com/nitrictech/cli/commit/64efe3eb5fcc380498a70d3cf79dc4d715dee21c))
* add entrypoint suffix to do app name ([b4a1fc7](https://github.com/nitrictech/cli/commit/b4a1fc72be26b3409ce2bb5956ac4b3e000a33f8))
* Await the deployment. ([291bb47](https://github.com/nitrictech/cli/commit/291bb47eff0753c04d401c0eb2b479f07a1fc7f6))
* AWS cloudfront deploys to use pre-provisioned certificates. ([e6ab460](https://github.com/nitrictech/cli/commit/e6ab460d38634b6235fbb85a71095714d66c24eb))
* don't use BuildKit for image builds ([f7a4c23](https://github.com/nitrictech/cli/commit/f7a4c2379df6084d8eb0e3d4cf48f99e579957f5))

### [0.0.49](https://github.com/nitrictech/cli/compare/v0.0.48...v0.0.49) (2021-06-06)


### Features

* Remove references to stage stack task. ([8ba641c](https://github.com/nitrictech/cli/commit/8ba641c66b130333bde19f4b7c42170c70abde85))
* Stage runtime as workaround for lack of external dockerfile support for dockerode. ([1c63ea7](https://github.com/nitrictech/cli/commit/1c63ea740e6d821c741ba7168ab6d83242d8cff6))
* WIP templates pulling into nitric project stacks. ([26f0c20](https://github.com/nitrictech/cli/commit/26f0c2033563baf3a3d3e222831a7ac58950d5a9))


### Bug Fixes

* Add ignore for dockerode build. ([4ec2fc3](https://github.com/nitrictech/cli/commit/4ec2fc3622f6eb636211ce88d9b8f6e48a84af10))

### [0.0.48](https://github.com/nitrictech/cli/compare/v0.0.47...v0.0.48) (2021-06-03)

### [0.0.47](https://github.com/nitrictech/cli/compare/v0.0.46...v0.0.47) (2021-06-02)


### Bug Fixes

* Remove autopull of official nitric template repository. ([96faf3f](https://github.com/nitrictech/cli/commit/96faf3f09958a020f14aa911217f6d500d416c7d))

### [0.0.46](https://github.com/nitrictech/cli/compare/v0.0.45...v0.0.46) (2021-05-28)

### [0.0.45](https://github.com/nitrictech/cli/compare/v0.0.44...v0.0.45) (2021-05-25)

### Bug Fixes

- allow unhandled exceptions to bubble up and print ([f07f24f](https://github.com/nitrictech/cli/commit/f07f24f97f7c33b16193c6bc6ccfea7c6b966516))

### [0.0.44](https://github.com/nitrictech/cli/compare/v0.0.43...v0.0.44) (2021-05-25)

### Features

- Add additional output results for gcp deployment. ([d7931e2](https://github.com/nitrictech/cli/commit/d7931e23caef19b664367211f346634c735dae0c))

### [0.0.43](https://github.com/nitrictech/cli/compare/v0.0.42...v0.0.43) (2021-05-24)

### Bug Fixes

- Add missing bucket deployments. ([5971b07](https://github.com/nitrictech/cli/commit/5971b0722c03f0943283c1541f51a8dab3efde38))

### [0.0.42](https://github.com/nitrictech/cli/compare/v0.0.41...v0.0.42) (2021-05-20)

### Bug Fixes

- Remove default root object. ([9dbf818](https://github.com/nitrictech/cli/commit/9dbf81883ef67cbe5fad3138c770a53b1f87008f))
- Working deployment. ([ede610e](https://github.com/nitrictech/cli/commit/ede610e2dd299984510e9878f249685b5f875fc4))

### [0.0.41](https://github.com/nitrictech/cli/compare/v0.0.40...v0.0.41) (2021-05-17)

### Bug Fixes

- **nit-368:** remove spaces before message ([db3aa50](https://github.com/nitrictech/cli/commit/db3aa500d0c0a4f979d33a2643ac9f19335c1923))

### [0.0.40](https://github.com/nitrictech/cli/compare/v0.0.39...v0.0.40) (2021-05-13)

### Bug Fixes

- Ensure NITRIC_HOME directory created before preferences is written. ([6b78bb3](https://github.com/nitrictech/cli/commit/6b78bb37ea462923aacbb2e7f284e3374d38e4cb))
- resolve unknown arguments error for base command parsing. ([6be0182](https://github.com/nitrictech/cli/commit/6be0182f6027ba67ba4029092e03be524d3ca627))

### [0.0.39](https://github.com/nitrictech/cli/compare/v0.0.38...v0.0.39) (2021-05-10)

### Bug Fixes

- catch more errors in run command, cleanup remaining commands ([a7c3eb5](https://github.com/nitrictech/cli/commit/a7c3eb560081319aa2b614df1141943985c84c3b))

### [0.0.38](https://github.com/nitrictech/cli/compare/v0.0.37...v0.0.38) (2021-05-10)

### Features

- Add ci mode to the CLI to enable a non-interactive DX. ([0fda8d6](https://github.com/nitrictech/cli/commit/0fda8d6d045eef787fb0bcd0e3d1452c95559da6))
- Finalize first cut of GA CLI integration. ([bd3cae5](https://github.com/nitrictech/cli/commit/bd3cae5b9bb6adf8ac058827af0f62ed42a85dc8))
- WIP Analytics integration for oclif commands. ([9c83777](https://github.com/nitrictech/cli/commit/9c8377759e904846e7ca7721f351fa9c991fbea6))
- WIP start for google analytics CLI integration. ([937d753](https://github.com/nitrictech/cli/commit/937d75359a8d5699af1039e118ab68309ba8855d))
- Wrap commands in BaseCommand. ([2483022](https://github.com/nitrictech/cli/commit/2483022f3dafa07dc3c7139e3cd82faec255d478))

### Bug Fixes

- Add missing peer dependency for cli-common. ([8cf883c](https://github.com/nitrictech/cli/commit/8cf883c7eb7f939270c8e44c3d3ad3b0c072e240))
- Common typings. ([da7ae00](https://github.com/nitrictech/cli/commit/da7ae002ae0c5a2ecce6234682d50860410008c3))
- Fix static method references in Preferences. ([ca03c2f](https://github.com/nitrictech/cli/commit/ca03c2f09c726405a36de935296a0f2198bf3545))
- **azure:** use new ci flag to mark non-interactive. ([d435dd4](https://github.com/nitrictech/cli/commit/d435dd41f522f577a9aff634a46dab5f98b74acf))
- replace remaining 'run' functions with 'do' ([f4ab4f9](https://github.com/nitrictech/cli/commit/f4ab4f90d237e3f6bfc869f690230e612dcf7fba))

### [0.0.37](https://github.com/nitrictech/cli/compare/v0.0.36...v0.0.37) (2021-05-08)

### Bug Fixes

- fix empty arrays default to null in stack definition ([4de0dba](https://github.com/nitrictech/cli/commit/4de0dbaec3ef67dbe5b245fd766557fed215c7a7))

### [0.0.36](https://github.com/nitrictech/cli/compare/v0.0.35...v0.0.36) (2021-05-07)

### Features

- Update repostory download. ([22bda35](https://github.com/nitrictech/cli/commit/22bda35f47d020c0581c982e8917f78e67ffacda))
- WIP stack definition refactor. ([f68c84b](https://github.com/nitrictech/cli/commit/f68c84b84f968ecfaa0fed3689a515a48bd6b3a2))

### Bug Fixes

- Ensure DO App creation waits on image push. ([4dd69a3](https://github.com/nitrictech/cli/commit/4dd69a36f537ae3ce2984d9ca037cf29f5df573e))
- Fix syntax error in method call. ([8414d4c](https://github.com/nitrictech/cli/commit/8414d4c46af55b48825875518623f2e8a24cc537))
- Missing NamedObject API type. ([98e2399](https://github.com/nitrictech/cli/commit/98e23991518f614b931dd0574eaa68e3ee97665e))
- Type error in azure plugin. ([bc0f394](https://github.com/nitrictech/cli/commit/bc0f3947e211aebd823399a37cbfa42a44ca663f))

### [0.0.35](https://github.com/nitrictech/cli/compare/v0.0.34...v0.0.35) (2021-05-04)

### [0.0.34](https://github.com/nitrictech/cli/compare/v0.0.33...v0.0.34) (2021-04-30)

### Features

- Upgrade AWS plugin dependencies. ([3b02f89](https://github.com/nitrictech/cli/commit/3b02f89aaf1ded81756b37105a9684add9bcec18))
- Upgrade libraries to pulumi 3. ([11b4a9b](https://github.com/nitrictech/cli/commit/11b4a9bd1edf1876ecdd32cb6183ba036a1f5b1d))

### Bug Fixes

- Fix deployable region subset for gcp plugin. ([e343966](https://github.com/nitrictech/cli/commit/e3439664306721f22137f91f2da61defcbcebbb4))
- setup all topics on 'run', even without subscribers ([66646ee](https://github.com/nitrictech/cli/commit/66646eec69a5e09b30d346e0cccd1461fccd1cc9))
- update pulumi api references in azure plugin ([6a98939](https://github.com/nitrictech/cli/commit/6a98939238c669f1172ebd677a6efe462af1c854))

### [0.0.33](https://github.com/nitrictech/cli/compare/v0.0.32...v0.0.33) (2021-04-27)

### [0.0.32](https://github.com/nitrictech/cli/compare/v0.0.31...v0.0.32) (2021-04-27)

### Features

- Increase docker build shm sizes. ([11b65b5](https://github.com/nitrictech/cli/commit/11b65b5e3c5b959dcb6c426f804465486f325128))
- Initial Digital Ocean plugin. ([78cc98d](https://github.com/nitrictech/cli/commit/78cc98d3815a8bf9c64a0403408ea3e592ea32bf))

### [0.0.31](https://github.com/nitrictech/cli/compare/v0.0.30...v0.0.31) (2021-04-27)

### Bug Fixes

- add repository and store check to doctor ([d5cd4c3](https://github.com/nitrictech/cli/commit/d5cd4c3ffb72dc029cc34a3b505174cf9633ec3d))
- **nit-298:** ensure the checkout directory exists before checkout ([8d398b1](https://github.com/nitrictech/cli/commit/8d398b1174b24506ffb761d0f81acddd2d707af9))

### [0.0.30](https://github.com/nitrictech/cli/compare/v0.0.29...v0.0.30) (2021-04-20)

### [0.0.29](https://github.com/nitrictech/cli/compare/v0.0.28...v0.0.29) (2021-04-20)

### [0.0.28](https://github.com/nitrictech/cli/compare/v0.0.27...v0.0.28) (2021-04-20)

### Bug Fixes

- use file path from stack file found for working directory ([1c123eb](https://github.com/nitrictech/cli/commit/1c123eb8d2ab4beb7574dbc17163e8d6c254d769))

### [0.0.27](https://github.com/nitrictech/cli/compare/v0.0.26...v0.0.27) (2021-04-20)

### Features

- Add function as an entrypoint type. ([e22a1be](https://github.com/nitrictech/cli/commit/e22a1bed11e2b1857456e14071716d6738871bd8))
- Connect functions to entrypoint proxy for nitric run. ([536e7a6](https://github.com/nitrictech/cli/commit/536e7a635fa07a78c77c6be5248ea01be246cb47))
- Connect gcp deployed functions to entrypoints. ([f9b215a](https://github.com/nitrictech/cli/commit/f9b215ad7e5c637ac7aa2768364127b23d691f1f))
- Map AWS deployed functions to entrypoints. ([b84fa38](https://github.com/nitrictech/cli/commit/b84fa38e128366ba029da7df80288b0c2de53663))

### Bug Fixes

- Fix AWS lambda gateway deployment. ([5052004](https://github.com/nitrictech/cli/commit/5052004666bb63eab1611c65fe8dd3a523e9c45f))
- Fix GCP subscription account name length. ([127eb94](https://github.com/nitrictech/cli/commit/127eb94da65d2025870c3cf28ee7fe41a582dee2))
- Have deployment output more useful errors. ([0f2b6a5](https://github.com/nitrictech/cli/commit/0f2b6a5b009a04147088d215c691542db6b192de))
- Incorrect hostname for local function entrypoint mapping. ([fb6217e](https://github.com/nitrictech/cli/commit/fb6217e990fa5a7c5f4a0bd41f17fb3491d15e72))
- Respect .dockerignore files specified in function templates. ([f78cdf0](https://github.com/nitrictech/cli/commit/f78cdf03ab8e1ca1f813c789e314036cc4195494))

### [0.0.26](https://github.com/nitrictech/cli/compare/v0.0.25...v0.0.26) (2021-04-11)

### Bug Fixes

- improve error message when function path can't be found ([fb215fb](https://github.com/nitrictech/cli/commit/fb215fb7d1354481bf1d24c414207ccb75571e87))

### [0.0.25](https://github.com/nitrictech/cli/compare/v0.0.24...v0.0.25) (2021-04-09)

### Features

- move from listr to listr2 for cli UX ([26e965a](https://github.com/nitrictech/cli/commit/26e965a805bae83a1af1c43d97267102586563a3))
- update gcp plugin commands to listr2 ([53e571f](https://github.com/nitrictech/cli/commit/53e571f5f46c014f3069575159b4c819e9b7f564))

### Bug Fixes

- Exit on build error and display more useful info. ([a197ef7](https://github.com/nitrictech/cli/commit/a197ef7fcde55fb312c9d3eb51c33afa9e89909c))
- improve error logging when stopping already stopped containers ([a328fb3](https://github.com/nitrictech/cli/commit/a328fb36934801a42fe22c4ec06ac77478737d46))
- reduce noise of aws:deploy and down ([9672873](https://github.com/nitrictech/cli/commit/96728730927ce6da787c0daf2079c1850c4e5fdf))
- update listr import in remaining commands ([535b43b](https://github.com/nitrictech/cli/commit/535b43bc795d992c8825622f1481ec78228d6793))

### [0.0.24](https://github.com/nitrictech/cli/compare/v0.0.23...v0.0.24) (2021-04-09)

### Bug Fixes

- Fix awaits on dockerode image pulls. ([af1b111](https://github.com/nitrictech/cli/commit/af1b11190e2a63fe8d25b28845a84f9ee0ec8bed))

### [0.0.23](https://github.com/nitrictech/cli/compare/v0.0.22...v0.0.23) (2021-04-06)

### Bug Fixes

- add default dir for deploy:aws cmd ([5e309f5](https://github.com/nitrictech/cli/commit/5e309f5714d6ae25d31ab6aed1e44144a945ad0b))
- deployment failures due to pulumi version ([be5aa0a](https://github.com/nitrictech/cli/commit/be5aa0ae58a87eb9e2db55b9e89199f786df5b4c))
- remove unused import ([152d586](https://github.com/nitrictech/cli/commit/152d5862572c34891646d26ada6fa6fc0bc7f5a3))
- Update gcp and aws pulumi dependencies. ([c28e187](https://github.com/nitrictech/cli/commit/c28e187be447c2fad61550cbbd89a1ff2f34fa1c))
- Update pulumi. ([2cbe552](https://github.com/nitrictech/cli/commit/2cbe552f604d7210b87dd0d5fdc34382e68700a6))

### [0.0.22](https://github.com/nitrictech/cli/compare/v0.0.21...v0.0.22) (2021-04-01)

### Bug Fixes

- add provider scope to down commands ([ecee9be](https://github.com/nitrictech/cli/commit/ecee9be14bd419a79b923fa0108e7947910339db))

### [0.0.21](https://github.com/nitrictech/cli/compare/v0.0.20...v0.0.21) (2021-04-01)

### Bug Fixes

- Add missing phantom dependencies. ([794fbe9](https://github.com/nitrictech/cli/commit/794fbe978df54d95749b8a9eac9401cf541eeb6d))

### [0.0.20](https://github.com/nitrictech/cli/compare/v0.0.19...v0.0.20) (2021-04-01)

### [0.0.19](https://github.com/nitrictech/cli/compare/v0.0.18...v0.0.19) (2021-04-01)

### Features

- Add deployment logging for AWS, GCP & Azure. ([798fb43](https://github.com/nitrictech/cli/commit/798fb43943c86d79211ae4eff08a68b0dcaaeccf))
- **common:** Add utilities for stack operation logging. ([c5e219d](https://github.com/nitrictech/cli/commit/c5e219d3e2c8cb260b237a2bdb4aa9ecad2725a1))

### Bug Fixes

- Fix missing common dependencies. ([6b8b305](https://github.com/nitrictech/cli/commit/6b8b305bd9f054bc6af43356a684c50c32a3c551))

### [0.0.18](https://github.com/nitrictech/cli/compare/v0.0.17...v0.0.18) (2021-03-30)

### Bug Fixes

- Scope stack names to providers for now. ([cc7de2a](https://github.com/nitrictech/cli/commit/cc7de2a5e319d353e14fa525d2d1e4ea183c97d6))

### [0.0.17](https://github.com/nitrictech/cli/compare/v0.0.16...v0.0.17) (2021-03-30)

### Features

- Add a quick link via the cli output. ([bb68b6d](https://github.com/nitrictech/cli/commit/bb68b6da86719355f0ef6fce26c1f81424edc216))
- Add custom type provider for cloud scheduler. ([6226e0b](https://github.com/nitrictech/cli/commit/6226e0b0fb058dcede2511f37aa29922900a3f5e))
- Add doctor:gcp command and tasks to install GCP pulumi plugin. ([528dab2](https://github.com/nitrictech/cli/commit/528dab26e8523d25de746cc05d8407413f3f7aeb))
- Add static site building before deploy. ([02541e1](https://github.com/nitrictech/cli/commit/02541e1ceac2328d61811d4eb3b7a94f3277984a))
- Add static site definition to NitricStack. ([530c2d6](https://github.com/nitrictech/cli/commit/530c2d6feaa59b901e6d4adb1f753065d207fc23))
- Add template for creating an event bus rule for scheduled events. ([5f70bf9](https://github.com/nitrictech/cli/commit/5f70bf9e5b0e50b9a911939217e9a5ca670a100c))
- add working aws api gateway deployment ([5b170d4](https://github.com/nitrictech/cli/commit/5b170d4a8ebe848c624f59cb83d0ecf7ca5feb7c))
- Connect up new site creation and entrypoint creation functions. ([628d58c](https://github.com/nitrictech/cli/commit/628d58ca547a0037f537d9dfaaf6f2d041fdc89c))
- HTTPs support for gcloud load balancer. ([2450d73](https://github.com/nitrictech/cli/commit/2450d731d1d990d390e672e8e96079a6afb349e7))
- Preliminary local run task, for nitric entrypoints. ([a6857de](https://github.com/nitrictech/cli/commit/a6857de93ba68e069626052819e6bb70c005776b))
- WIP commands for template repository download/listing. ([60bba71](https://github.com/nitrictech/cli/commit/60bba716af151111e8c2b01777930c2cf2f7c1be))
- WIP doctor command to install pre-requisite software. ([f9bbf03](https://github.com/nitrictech/cli/commit/f9bbf03017739ec9cc81ac77f1cc57c9482583fc))
- WIP entrypoints for AWS cloudfront/s3 buckets. ([68db125](https://github.com/nitrictech/cli/commit/68db125f46e08dbfe125462f4e4917916b4c63cc))
- WIP GCP entrypoints support. ([ebb90b6](https://github.com/nitrictech/cli/commit/ebb90b675b638b34633f232c12ff37e014e38fdb))
- WIP google pulumi implementation. ([2a8a823](https://github.com/nitrictech/cli/commit/2a8a823ef8034fffe120b638f28ad91882753bfa))
- WIP implementation of schedule deployment on google cloud. ([595821c](https://github.com/nitrictech/cli/commit/595821c532ef7b22eb3c7ba24a41df7ba43a6977))
- Working API/Site deploy for AWS. ([5edd67f](https://github.com/nitrictech/cli/commit/5edd67ff188f6546d5b02eab4fcb93ffcb230987))
- Working Azure AppService deployment for nitric functions. ([0ea6237](https://github.com/nitrictech/cli/commit/0ea62376df237d1b01ba2265e65eb2533ee7931a))
- Working GCP pulumi deployment. ([7ceb282](https://github.com/nitrictech/cli/commit/7ceb282b77b04f4191dcf2064ea271bf6c28d690))
- Working local entrypoints deployment. ([9855ce1](https://github.com/nitrictech/cli/commit/9855ce15ab8213b978c2a3871d517aa92723ae99))
- Working static site deployment. ([7a45fd4](https://github.com/nitrictech/cli/commit/7a45fd4a052617eda1eb20f506a1942a12614dfe))
- **azure:** Wrap up prototype deployment scripts for azure. ([8219a01](https://github.com/nitrictech/cli/commit/8219a01a324d1497dc0cce17c8f1d5a71e3db78f))
- **cli:** WIP GCP API Gateway implementation. ([e5019d8](https://github.com/nitrictech/cli/commit/e5019d897f0f8f5d4ec2c7135de15ff42dee9d95))
- **cli-common:** Add API definitions for NitricStack ([a76ed94](https://github.com/nitrictech/cli/commit/a76ed94273b8292a96f133280ce16a3fca78e310))
- **cli/gcp:** Working GCP APIGateway Deployment. ([3d727c6](https://github.com/nitrictech/cli/commit/3d727c633a67916c630ecbe39f6de1caafdb1ef9))
- **gcp:** Working inline docker build/push ([0c75d18](https://github.com/nitrictech/cli/commit/0c75d18a7d7e07ae3de8e36dd81efeb76d02daf1))
- **run:** Add API port mapping to output. ([14ea3cb](https://github.com/nitrictech/cli/commit/14ea3cbeffd64767d96ae2e9e76c108bd2c783f1))
- **run:** WIP local API gateway. ([2ca0fee](https://github.com/nitrictech/cli/commit/2ca0fee8bf062a5c2ec03a988b2b200e5a729148))
- **run:** Working API gateway startup on run. ([2b7f63e](https://github.com/nitrictech/cli/commit/2b7f63e4c1ce234ecf0d4e434ee0d3f321148233))
- Working API gateway deployment. ([61ce682](https://github.com/nitrictech/cli/commit/61ce6823f2a276622f5cf88227a983f57461ea91))
- Working schedule deployments for GCP. ([050711b](https://github.com/nitrictech/cli/commit/050711bd9588b1ac5f5640609c7313a3f8f5b042))

### Bug Fixes

- add check for valid project names in make:project ([c2ee442](https://github.com/nitrictech/cli/commit/c2ee4421e32913f3cdad0fbdd6d7b9659876d8fe))
- build task splits repo and template names to find each individually ([480622d](https://github.com/nitrictech/cli/commit/480622dc50708a1866c020cc565c37b4eb579e19))
- check if at least one repo is available when listing templates ([885980a](https://github.com/nitrictech/cli/commit/885980a034a02c82ab2ebc7a66655b0b934acc59))
- clear container start timeout on successful start ([c4c997b](https://github.com/nitrictech/cli/commit/c4c997bb8a6314224b9fd25dbec539f394c9ef7e))
- copy the full template directory during build staging ([f32fcad](https://github.com/nitrictech/cli/commit/f32fcad284e6e05848171abd2be9ccf50775dd8e))
- correct make project task classname ([3532329](https://github.com/nitrictech/cli/commit/35323296ca50494fc55fd46a72ef41ced0d29e11))
- delete placeholder create command ([86108a5](https://github.com/nitrictech/cli/commit/86108a5586e40a1bf1ee3428b9a4cc28d2994ea0))
- ignore legacy or superfluous template repo directories ([9b6390d](https://github.com/nitrictech/cli/commit/9b6390d19d7c84ed088d94563dfac496068070bb))
- improve handling of failing to set docker network ([77533e2](https://github.com/nitrictech/cli/commit/77533e2a3cb1ce14c972f588e56bd1f8d3390ae1))
- improve plugin load performance ([916f7a0](https://github.com/nitrictech/cli/commit/916f7a05ca25301cf4292edca9aee42c419aa907))
- make port optional for RunFunctionTask ([ad01135](https://github.com/nitrictech/cli/commit/ad01135dd7a03db5e502508cdfc2ac5a2707c981))
- minor issues in utils functions ([bbd68d5](https://github.com/nitrictech/cli/commit/bbd68d5c5187461e56a747724ccecfcfa12f0551))
- move project name validation before prompts ([dbf12bc](https://github.com/nitrictech/cli/commit/dbf12bc88cfc8919a151692bfa9080a7b46f1aac))
- passthrough stdio for doctor installs ([8e7cf4a](https://github.com/nitrictech/cli/commit/8e7cf4ac7f3c7c08eed7e2126ec5acc9807a4c01))
- set default example func name if none provide for new project ([e7c8342](https://github.com/nitrictech/cli/commit/e7c8342da378d5c30ad04d11af186403538dc490))
- stop warning about default network when no custom network set ([cdba178](https://github.com/nitrictech/cli/commit/cdba17823605778d2d7394adb19fc57219ca2bba))
- typo in docker container hostconfig ([a6942c1](https://github.com/nitrictech/cli/commit/a6942c134b66c25b19f9ffa01d8f954ba0dc2244))

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
