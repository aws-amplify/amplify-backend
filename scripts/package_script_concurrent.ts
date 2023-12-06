import { glob } from 'glob';
import { execa } from 'execa';

// Until npm supports concurrent workspace command execution, this can be used to run commands concurrently
// https://github.com/npm/feedback/discussions/781

const runArgs = process.argv.slice(2);

const packagePaths = await glob('./packages/*');

const runPromises = packagePaths.map((packagePath) =>
  execa('npm', ['run', ...runArgs], { cwd: packagePath, stdio: 'inherit' })
);

await Promise.all(runPromises);
