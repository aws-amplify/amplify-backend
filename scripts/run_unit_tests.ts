import { glob } from 'glob';
import { execa } from 'execa';

/**
 * Constructs a list of test files from a glob pattern and executes the node test harness with this list
 *
 * By default, it will execute all tests in the whole repo.
 * A directory name can be specified to the command to only runs tests in a single package.
 * i.e. `npm test lib-synth` will run all test files in packages/lib-synth/**
 */
const main = async () => {
  const dir = process.argv[2];
  const pattern = dir
    ? `packages/${dir}/**/*.test.ts`
    : `packages/**/*.test.ts`;
  const files = await glob(pattern);
  const args = ['--loader', 'tsx', '--test'];
  args.push(...files);
  await execa('node', args, { stdio: 'inherit' });
};

main().catch(console.error);
