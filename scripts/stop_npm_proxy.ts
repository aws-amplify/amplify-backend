import { execa, execaCommand } from 'execa';

const VERDACCIO_PORT = 4873;
const NPM_REGISTRY = 'https://registry.npmjs.org/';

/**
 * Kills the process that is listening on VERDACCIO_PORT
 * Resets npm registry config back to the npm registry
 */
// reset the npm registry
await execa('npm', ['config', 'set', 'registry', NPM_REGISTRY]);

// returns the process id of the process listening on the specified port
let pid: number;
try {
  const lsofResult = await execaCommand(
    `lsof -n -t -iTCP:${VERDACCIO_PORT} -sTCP:LISTEN`
  );
  pid = Number.parseInt(lsofResult.stdout.toString());
} catch (err) {
  console.warn(
    'Could not determine npm proxy process id. Most likely the process has already been stopped.'
  );
  process.exit(0);
}
process.kill(pid);
