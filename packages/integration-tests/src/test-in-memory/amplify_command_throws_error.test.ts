import { execa } from 'execa';
import assert from 'node:assert';
import { EOL } from 'os';
import test from 'node:test';

void test('amplify command throws error directing customers to ampx', async () => {
  const { stdout } = await execa('npx', ['amplify', '--help'], {
    reject: false,
  });
  assert.ok(
    stdout.includes(
      'InvalidCommandError: The Amplify Gen 2 CLI has been renamed'
    ),
    `Expected command output to include invalid command preamble. Instead found${EOL}${stdout}`
  );
  assert.ok(
    stdout.includes('npx ampx --help'),
    `Expected command output to include ampx command suggestion. Instead found${EOL}${stdout}`
  );
});
