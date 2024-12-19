import { glob } from 'glob';

let result = await glob('packages/**/*.test.js', {
  absolute: true,
});
result = result.filter((result) => !result.includes('integration-tests'));
result.push(
  ...(await glob('packages/integration-tests/lib/test-in-memory/**/*.test.js', {
    absolute: true,
  }))
);

console.log(result.join(' '));
