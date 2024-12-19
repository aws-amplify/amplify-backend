import { glob } from 'glob';

let result = await glob('packages/**/*.test.js');
result = result.filter((result) => !result.includes('integration-tests'));
result.push(
  ...(await glob('packages/integration-tests/lib/test-in-memory/**/*.test.js'))
);

console.log(result.join(' '));
