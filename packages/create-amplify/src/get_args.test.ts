import { describe, it } from 'node:test';
import assert from 'assert';
import { getArgs } from './get_args.js';

void describe('getArgs', () => {
  void it('should return basic subcommands and flags', async () => {
    process.argv = ['node', 'script.js', 'create', '--debug', '--yes'];
    const result1 = getArgs();
    assert.deepStrictEqual(result1.subcommands, ['create']);
    assert.deepStrictEqual(result1.options, []);
    assert.deepStrictEqual(result1.flags, ['debug', 'yes']);
  });

  void it('should return subcommands, options with values, and flags', () => {
    process.argv = [
      'node',
      'script.js',
      'serve',
      '--port=8080',
      '--verbose=true',
      '--production',
    ];
    const result2 = getArgs();
    assert.deepStrictEqual(result2.subcommands, ['serve']);
    assert.deepStrictEqual(result2.options, [
      { name: 'port', value: '8080' },
      { name: 'verbose', value: 'true' },
    ]);
    assert.deepStrictEqual(result2.flags, ['production']);
  });
});
