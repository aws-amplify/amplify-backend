import { glob } from 'glob';

let result = await glob('packages/**/*.test.js', {
  posix: true,
});
result = result.filter((result) => !result.includes('integration-tests'));
result.push(
  ...(await glob('packages/integration-tests/lib/test-in-memory/**/*.test.js', {
    posix: true,
  }))
);

console.log(result.join(' '));
