import * as fsp from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import {
  PackageJson,
  writePackageJson,
} from './components/package-json/package_json.js';

const projectName = process.argv[2];
if (!projectName) {
  throw new Error('Usage: npm run setup:test-project <name>');
}

const testProjectDir = new URL(
  `../test-projects/${projectName}`,
  import.meta.url
);
await fsp.mkdir(testProjectDir, { recursive: true });

// reaching into the create-amplify package like this isn't great, but for a test utility I think it's acceptable
// if it breaks, it will only break this local script, not anything in production
const createAmplifyTemplateLocation = new URL(
  '../packages/create-amplify/templates/basic-auth-data',
  import.meta.url
);

// copy getting started project template
await fsp.cp(createAmplifyTemplateLocation, testProjectDir, {
  recursive: true,
});

// create minimal package.json
// if you want to test out changes in a commonjs package, change the "type" field in the package.json of the test project after it is created
const packageJson: PackageJson = {
  name: projectName,
  version: '1.0.0',
  type: 'module',
};

await writePackageJson(fileURLToPath(testProjectDir), packageJson);

// create minimal tsconfig.json
const tsConfig = {
  extends: '../../../tsconfig.base.json',
  compilerOptions: {
    moduleResolution: 'bundler',
    module: 'es2022',
  },
};

const tsConfigPath = path.join(
  fileURLToPath(testProjectDir),
  'amplify',
  'tsconfig.json'
);

await fsp.writeFile(tsConfigPath, JSON.stringify(tsConfig, null, 2));
