import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { TypedConfigurationFileFactory } from './typed_configuration_file_factory';
import { z } from 'zod';

void describe('TypedConfigurationFileFactory', () => {
  void it('getInstance should return the same instance for the same fileName', () => {
    const factory = new TypedConfigurationFileFactory();
    const schema = z.object({
      value: z.string(),
    });
    const defaultValue = { value: 'test' };

    const instance1 = factory.getInstance(
      'notices_metadata.json',
      schema,
      defaultValue,
    );
    const instance2 = factory.getInstance(
      'notices_metadata.json',
      schema,
      defaultValue,
    );

    assert.strictEqual(
      instance1,
      instance2,
      'Expected getInstance to return the same instance for the same fileName',
    );
  });

  void it('getInstance should return different instances for different fileNames', () => {
    const factory = new TypedConfigurationFileFactory();
    const schema = z.object({
      value: z.string(),
    });
    const defaultValue = { value: 'test' };

    const instance1 = factory.getInstance(
      'notices_metadata.json',
      schema,
      defaultValue,
    );
    const instance2 = factory.getInstance(
      'notices_acknowledgments.json',
      schema,
      defaultValue,
    );

    assert.notStrictEqual(
      instance1,
      instance2,
      'Expected getInstance to return different instances for different fileNames',
    );
  });
});
