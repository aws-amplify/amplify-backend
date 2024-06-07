# Seed POC

## Overview

This is a prototype of seed functionality described https://github.com/aws-amplify/amplify-backend/issues/875.

## Sample seed file

Can be seen here https://github.com/aws-amplify/amplify-backend/blob/seed-poc/test-projects/seed-poc/amplify/seed.ts.

## Local setup

```shell
git checkout seed-poc
npm run clean
npm run setup:local
cd test-projects/seed-poc/
npx ampx sandbox --once
npx ampx sandbox seed
```

## Open questions/issues

### Should `seed.ts` script export function or should it be self-contained?

The `seed-poc` branch currently has a version that is self-contained as problems with exported function approach
led to immediate pivot.

Problems with exported function approach:

1. It has to be loaded dynamically by some process, either CLI or child of CLI.
2. Dynamic import requires `seed.ts` and all imported dependencies (including `backend.ts` and `resource.ts` files)
   to be compiled and compilation output present on disk. This pollutes local workspace and may lead to inconsistencies
   as normal deployment does not compile TS files.
3. An attempt to point TS compiler at `seed.ts` makes it ignore `tsconfig.json` files and requires passing explicit flags.
   Similar discussion around typechecking of `backend.ts` during synthesis led us to conclusion that `tsconfig.json`
   should be used and honored in scenarios that involve compilation.

Self-contained approach voids above concerns:

1. It is possible to `tsx seed.ts` without producing JS files and still honoring `tsconfig.json`.
2. Implicit and explicit execution is possible:
   1. Implicitly `defineSeed(callback)` can be hooked up to `beforeExit` process event (this is how current version of prototype does it).
   2. Explicit `await defineSeed(callback).execute()` would also be possible.

Prisma seems to follow self-contained approach, see https://www.prisma.io/docs/orm/prisma-migrate/workflows/seeding.

### Should we infer verticals presence from backend definition or amplify outputs?

Both `backend.ts` and `amplify_outputs.json` carry information about which verticals has been provisioned.

The major difference is that backend definition is available pre-deployment and outputs are available post deployment.

Below are some pros and cons of both approaches. But perhaps conclusion might be to seek alternative designs where
we offer clients to seed backend but customer has to explicitly access them and use resource names. Something like:

```typescript
await new Seeder()
  .withData<DataSchema>()
  .withAuth()
  .withStorage('storage1')
  .withStorage('storage2')
  .seed((dataClient, authClient, storage1Client, storage2Client) => {});
```

#### `backend.ts`

Pros:

1. It is possible to author `seed.ts` script along with `backend.ts` without making any deployment.

Cons:

1. It is easy to accidentally trigger synthesis by importing `backend.ts` into `seed.ts`.
   1. `import type { backend } from './backend';` does not trigger synthesis.
   2. `import { backend } from './backend';` does trigger synthesis.
      1. This could be suppressed by instrumenting `cdk.App` creation in Gen2 backend internals.
      2. Suppression will most likely come in a form of environment variable. Side effect of that is
         that attempt to execute `seed.ts` without CLI involvement (if it's kept standalone) will result in synth errors.
2. An attempt to execute `seed.ts` might be out of sync with deployment state.
3. Inferring verticals presence from `defineBackend` return type is complicated.
   1. Customer may use arbitrary names, i.e. `defineBackend({ myData, myAuth})`, so these can't be used for inference.
   2. Construct factories must expose some (presumably) public property that carries information about vertical.
      1. This will create coupling between pre and post deployment packages outside of our `client-config` abstraction.
      2. It should be validated that this approach solves cases where same vertical type appears multiple times, e.g. storage.

#### `amplify_outputs.json`

Pros:

1. Always reflects state of deployed environment.
2. Does not require public APIs to be added to `backend-X` packages.
3. Removes problem of accidental synthesis.

Cons:

1. The file might be in couple of different formats/schemas.
2. Must be accomplished through file representation of outputs. Programmatic access to client config can't be used to infer presence - it's typed as superset.

### How do we smuggle API schema into seed functionality?

We seem to have a chicken and egg problem when it comes to generating API client.

1. Schema definition resides in `data/resource.ts` file, but nothing prevents customer to move it somewhere else.
2. Schema definition seems to be required input to correctly type `V6Client` and this must be available at compile time.
3. There doesn't seem to be a way to use `amplify_outputs.json` to achieve this, MIS seems to be input to runtime behavior
   not to compilation or syntax support.

Therefore it seems that seed DX should be redefined in such a way that customer provides schema through import statements.
