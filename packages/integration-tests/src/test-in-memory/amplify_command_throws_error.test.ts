import { execa } from 'execa';
import assert from 'node:assert';
import test from 'node:test';

void test('amplify command throws error directing customers to ampx', async () => {
  const { stdout } = await execa('npx', ['amplify', '--help'], {
    reject: false,
  });
  assert.ok(
    stdout.includes(
      'InvalidCommandError: The Amplify Gen 2 CLI has been renamed'
    )
  );
  assert.ok(stdout.includes('npx ampx --help'));
});
