import { glob } from 'glob';

const result = await glob(
  'packages/integration-tests/lib/test-e2e/deployment/*.deployment.test.js'
);
console.log(JSON.stringify(result));
