import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { ZodSchemaTypedConfigurationFile } from './typed_configuration_file';
import { promises as fsp } from 'fs';

void describe('ZodSchemaTypedConfigurationFile', async () => {
  // Define a sample schema for testing
  const testSchema = z.object({
    name: z.string(),
    value: z.number(),
  });

  const defaultValue = {
    name: 'default',
    value: 0,
  };

  // Mock filesystem modules
  const mockFsp = {
    readFile: async () => '',
  };

  const mockExistsSync = () => false;

  void it('should return default value when file does not exist', async () => {
    const config = new ZodSchemaTypedConfigurationFile(
      testSchema,
      'test-config.json',
      defaultValue,
      mockFsp as unknown as typeof fsp,
      mockExistsSync,
    );

    const result = await config.read();
    assert.deepEqual(result, defaultValue);
  });

  void it('should parse and return valid file content', async () => {
    const validContent = {
      name: 'test',
      value: 42,
    };

    const mockFspWithContent = {
      readFile: async () => JSON.stringify(validContent),
    };

    const mockExistsSyncTrue = () => true;

    const config = new ZodSchemaTypedConfigurationFile(
      testSchema,
      'test-config.json',
      defaultValue,
      mockFspWithContent as unknown as typeof fsp,
      mockExistsSyncTrue,
    );

    const result = await config.read();
    assert.deepEqual(result, validContent);
  });

  void it('should return default value when file content is invalid JSON', async () => {
    const mockFspWithInvalidContent = {
      readFile: async () => 'invalid json',
    };

    const mockExistsSyncTrue = () => true;

    const config = new ZodSchemaTypedConfigurationFile(
      testSchema,
      'test-config.json',
      defaultValue,
      mockFspWithInvalidContent as unknown as typeof fsp,
      mockExistsSyncTrue,
    );

    const result = await config.read();
    assert.deepEqual(result, defaultValue);
  });

  void it('should return default value when file content does not match schema', async () => {
    const invalidContent = {
      name: 123, // should be string
      value: 'invalid', // should be number
    };

    const mockFspWithInvalidContent = {
      readFile: async () => JSON.stringify(invalidContent),
    };

    const mockExistsSyncTrue = () => true;

    const config = new ZodSchemaTypedConfigurationFile(
      testSchema,
      'test-config.json',
      defaultValue,
      mockFspWithInvalidContent as unknown as typeof fsp,
      mockExistsSyncTrue,
    );

    const result = await config.read();
    assert.deepEqual(result, defaultValue);
  });

  void it('should cache data after first read', async () => {
    let readCount = 0;
    const mockFspWithCounter = {
      readFile: async () => {
        readCount++;
        return JSON.stringify(defaultValue);
      },
    };

    const mockExistsSyncTrue = () => true;

    const config = new ZodSchemaTypedConfigurationFile(
      testSchema,
      'test-config.json',
      defaultValue,
      mockFspWithCounter as unknown as typeof fsp,
      mockExistsSyncTrue,
    );

    await config.read();
    await config.read();
    assert.equal(readCount, 1);
  });
});
