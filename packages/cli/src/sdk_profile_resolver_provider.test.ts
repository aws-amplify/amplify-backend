import { afterEach, describe, it } from 'node:test';
import assert from 'node:assert';
import { SDKProfileResolverProvider } from './sdk_profile_resolver_provider.js';

void describe('sdk profile resolver provider', () => {
  const originalProcessArgv = process.argv;
  afterEach(() => {
    process.argv = originalProcessArgv;
  });
  void it('returns undefined when no profile is provided', () => {
    process.argv = ['node', 'some/path/ampx.js', 'some', 'option'];
    const profile = new SDKProfileResolverProvider().resolve();
    assert.ok(
      !profile,
      `No value should have been returned, rather we got ${profile}`
    );
  });

  void it('returns correct profile when profile is provided', () => {
    process.argv = [
      'node',
      'some/path/ampx.js',
      'some',
      'option',
      '--profile',
      'myProfile',
    ];
    const profile = new SDKProfileResolverProvider().resolve();
    assert.equal(profile, 'myProfile');
  });
  void it('returns undefined when profile switch is used but no value is provided', () => {
    process.argv = ['node', 'some/path/ampx.js', 'some', 'option', '--profile'];
    const profile = new SDKProfileResolverProvider().resolve();
    assert.ok(
      !profile,
      `No value should have been returned, rather we got ${profile}`
    );
  });
});
