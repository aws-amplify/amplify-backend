# @aws-amplify/form-generator

## 1.2.4

### Patch Changes

- b9222fc: Ensure that @graphql-tools/merge pinning works for Yarn 4.x

## 1.2.3

### Patch Changes

- 6fb5f91: Bundle graphql-tools/merge due to https://github.com/ardatan/graphql-tools/issues/7290

## 1.2.2

### Patch Changes

- 97a7284: Pin graphql-tools/merge due to https://github.com/ardatan/graphql-tools/issues/7290

## 1.2.1

### Patch Changes

- 51bc721: Bumps [@aws-amplify/graphql-directives](https://github.com/aws-amplify/amplify-category-api/tree/HEAD/packages/amplify-graphql-directives) from 1.1.0 to 2.7.0.

## 1.2.0

### Minor Changes

- d09014b: integrate with aws cdk toolkit

### Patch Changes

- d09014b: Bumps [@graphql-codegen/typescript](https://github.com/dotansimha/graphql-code-generator/tree/HEAD/packages/plugins/typescript/typescript) from 2.8.8 to 4.1.5.

## 1.1.0

### Minor Changes

- 8f59d16: integrate with aws cdk toolkit

### Patch Changes

- 29a6167: Bumps [@graphql-codegen/typescript](https://github.com/dotansimha/graphql-code-generator/tree/HEAD/packages/plugins/typescript/typescript) from 2.8.8 to 4.1.5.

## 1.0.5

### Patch Changes

- 99f5d0b: lint and format with new version of prettier
- 99f5d0b: Updates `prettier` from 2.8.8 to 3.4.2
  Updates `@types/prettier` from 2.7.3 to 3.0.0

## 1.0.4

### Patch Changes

- bc07307: Update code with Eslint@8 compliant

## 1.0.3

### Patch Changes

- e325044: Prefer amplify errors in generators

## 1.0.2

### Patch Changes

- e648e8e: added main field to package.json so these packages are resolvable
- e648e8e: added main field to packages known to lack one

## 1.0.1

### Patch Changes

- 3c698e0: upgrade AWS SDK packages to latest

## 1.0.0

### Major Changes

- 51195e2: Major version bump for all public pacakges.

## 0.10.0

### Minor Changes

- d0f1452: bump codegen and amplify data cdk construct, schema generator dependencies

## 0.9.0

### Minor Changes

- 9ea3c38: bumps the codegen dependencies to use the latest tag

## 0.8.0

### Minor Changes

- f76e983: Use updated metadata fields in form and model generation
- a494aca: refactor: use default directives
- 27bcc97: Fix utils file generator to generate aws-amplify v6 imports

### Patch Changes

- 8901779: fix test assertions compatible with new @aws-amplify/codegen-ui-react package
- 592bd4f: refactor log abstraction in `client-config`, `form-generator`, and `model-generator` packages
- 73dcd6e: fix: update model introspection schema generation packages for references relationships

## 0.8.0-beta.5

### Patch Changes

- 73dcd6e: fix: update model introspection schema generation packages for references relationships

## 0.8.0-beta.4

### Minor Changes

- a494aca: refactor: use default directives

## 0.8.0-beta.3

### Minor Changes

- f76e983: Use updated metadata fields in form and model generation

## 0.8.0-beta.2

### Patch Changes

- 592bd4f: refactor log abstraction in `client-config`, `form-generator`, and `model-generator` packages

## 0.8.0-beta.1

### Patch Changes

- 8901779: fix test assertions compatible with new @aws-amplify/codegen-ui-react package

## 0.8.0-beta.0

### Minor Changes

- 27bcc979a: Fix utils file generator to generate aws-amplify v6 imports

## 0.7.0

### Minor Changes

- 4c1485aa4: print out file written for amplify generate commands

## 0.6.1

### Patch Changes

- 04f067837: Implement consistent dependency declaration check. Bumped dependencies where necessary.

## 0.6.0

### Minor Changes

- f081c223c: Manually exclude timestamp fields from generated forms

## 0.5.0

### Minor Changes

- cc8b66cd9: updates the form renderer to generate amplify js v6 compatible code

## 0.4.0

### Minor Changes

- fc71c4902: Change the default directory for models in form generation

## 0.3.0

### Minor Changes

- 863dc241: Use "use client"; directive in generated React components

## 0.2.0

### Minor Changes

- ad73f897: Add UI form generation to CLI
- aee0a52d: use latest version of codegen
- b1da9601: Fix missing generated files
- 2b18af15: Add model filtering to form generation

### Patch Changes

- b2b0c2da: force version bump
- 1817c55c: Generate type declaration files for rendered components
- 36d93e46: add license to package.json
- 512f0778: move UniqueBackendIdentifier to platform-core package

## 0.2.0-alpha.4

### Minor Changes

- aee0a52d: use latest version of codegen

### Patch Changes

- 1817c55c: Generate type declaration files for rendered components

## 0.2.0-alpha.3

### Patch Changes

- 36d93e46: add license to package.json

## 0.2.0-alpha.2

### Minor Changes

- b1da9601: Fix missing generated files
- 2b18af15: Add model filtering to form generation

### Patch Changes

- 512f0778: move UniqueBackendIdentifier to platform-core package

## 0.2.0-alpha.1

### Minor Changes

- ad73f897: Add UI form generation to CLI

## 0.1.1-alpha.0

### Patch Changes

- b2b0c2d: force version bump
