import { glob } from 'glob';

const result = await glob(
  'packages/integration-tests/lib/test-e2e/sandbox/*.sandbox.test.js'
);
console.log(JSON.stringify(result));
