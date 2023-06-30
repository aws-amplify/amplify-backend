import { execa, execaCommand } from 'execa';

const VERDACCIO_PORT = 4873;
const NPM_REGISTRY = 'https://registry.npmjs.org/';

/**
 * Kills the process that is listening on VERDACCIO_PORT
 * Resets npm registry config back to the npm registry
 */
const main = async () => {
  // reset the npm registry
  await execa('npm', ['config', 'set', 'registry', NPM_REGISTRY]);

  // returns the process id of the process listening on the specified port
  const lsofResult = await execaCommand(
    `lsof -n -t -iTCP:${VERDACCIO_PORT} -sTCP:LISTEN`
  );
  const pid = Number.parseInt(lsofResult.stdout.toString());
  process.kill(pid);
};

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
