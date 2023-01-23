import { Command, createCommand } from 'commander';
import { executeCDKCommand } from '../execute-cdk-command';

export const getCommand = (): Command => {
  return createCommand('push')
    .description('Deploy an Amplify project to a specific environment')
    .argument('env', 'The cloud environment to which the project will be deployed')
    .action(pushHandler);
};

/**
 * Performs a synth, then executes cdk deploy on the resulting CloudAssembly
 * @param env
 * @param options
 */
const pushHandler = async (env: string, options: any) => {
  await executeCDKCommand('deploy', '--app', `nxt synth ${env}`, '--all', '--require-approval', 'never', '--concurrency', '5');
  // pull frontend config
};
