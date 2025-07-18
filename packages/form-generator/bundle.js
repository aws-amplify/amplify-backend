// eslint-disable-next-line import/no-extraneous-dependencies
import esbuild from 'esbuild';
import fs from 'fs';
let pkg = JSON.parse(fs.readFileSync('package.json'));

// Note: This is due to https://github.com/aws-amplify/amplify-backend/issues/2901
// The goal is to bundle form-generator code and @graphql-codegen/core dependency only.
// (minimal viable solution until we figure out global bundling strategy).
// 1. @graphql-codegen/core dependency was moved to root package.json.
//    This ensures that package managers don't attempt to install it.
//    E.g. Yarn 4.x attempts to install any dependency, prod, dev, bundled not respectig NPM spec.
// 2. All other dependencies (that are not problematic at this time) are listed in 'pkg.dependencies' and are exluded from bundling.
//    An attempt to bundle them results in 35MB bundle size and runtime errors like 'Dynamic require of \"buffer\" is not supported'.
//   These dependencies will be installed by package managers in custmer project.
let external = Object.keys(pkg.dependencies);

await esbuild.build({
  entryPoints: ['src/index.ts'],
  bundle: true,
  outfile: 'lib/bundled/index.js',
  external,
  logLevel: 'info',
  platform: 'node',
  target: 'node18',
  format: 'esm',
  sourcemap: true,
});
