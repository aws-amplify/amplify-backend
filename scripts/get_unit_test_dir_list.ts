import { glob } from 'glob';
import * as path from 'path';

let result = await glob('packages/*');
result = result.filter((result) => !result.includes('integration-tests'));
result.push(
  path.join('packages', 'integration-tests', 'lib', 'test-in-memory')
);
result.push('scripts');
console.log(result.join(' '));
