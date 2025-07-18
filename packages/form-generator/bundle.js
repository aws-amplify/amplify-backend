// eslint-disable-next-line import/no-extraneous-dependencies
import esbuild from 'esbuild';
import fs from 'fs';
let pkg = JSON.parse(fs.readFileSync('package.json'));

// Note: the @graphql-codegen/core dependency has been moved to root package.json
// due to https://github.com/aws-amplify/amplify-backend/issues/2901
let external = Object.keys(pkg.dependencies)

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
