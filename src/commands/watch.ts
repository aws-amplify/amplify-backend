import { Command, createCommand } from 'commander';
import { executeCDKCommand } from '../execute-cdk-command';
import { CdkToolkit } from 'aws-cdk/lib/cdk-toolkit';
import * as fs from 'fs-extra';
import execa from 'execa';

export const getCommand = (): Command => {
  return createCommand('watch')
    .description('Immediately push local project changes when detected. ')
    .argument('env', 'The cloud environment to which changes will be deployed')
    .action(watchHandler);
};

/**
 * Wrapper around cdk synth
 * @param env
 * @param options
 */
const watchHandler = async (env: string, options: any) => {
  fs.writeFileSync('cdk.json', JSON.stringify({ watch: {} }));
  process.on('exit', () => fs.unlinkSync('cdk.json'));
  process.on('SIGINT', () => fs.unlinkSync('cdk.json'));

  await executeCDKCommand('watch', '--all', '--app', `nxt synth ${env}`, '--require-approval', 'never', '--concurrency', '5');
};
