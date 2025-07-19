import { describe, it } from 'node:test';
import assert from 'node:assert';
import { createFriendlyName } from './cloudformation_format.js';

void describe('createFriendlyName function', () => {
  void it('handles empty string by returning the original ID', () => {
    const emptyId = '';
    assert.strictEqual(createFriendlyName(emptyId), emptyId);
  });

  void it('uses CDK metadata construct path when available', () => {
    const logicalId = 'amplifyFunction123ABC45';
    const metadata = { constructPath: 'MyStack/MyFunction/Resource' };
    assert.strictEqual(createFriendlyName(logicalId, metadata), 'My Function');
  });

  void it('removes amplify prefix and formats camel case', () => {
    const logicalId = 'amplifyDataTable123ABC45';
    assert.strictEqual(createFriendlyName(logicalId), 'Data Table');
  });

  void it('removes Amplify prefix (capitalized) and formats camel case', () => {
    const logicalId = 'AmplifyDataTable123ABC45';
    assert.strictEqual(createFriendlyName(logicalId), 'Data Table');
  });

  void it('handles IDs with only numeric characters', () => {
    const numericId = '12345';
    assert.strictEqual(createFriendlyName(numericId), numericId);
  });

  void it('normalizes CDK construct paths', () => {
    const logicalId = 'amplifyFunction';
    const metadata = {
      constructPath: 'MyStack/auth.NestedStack/auth.NestedStackResource',
    };
    assert.strictEqual(createFriendlyName(logicalId, metadata), 'auth');
  });

  void it('skips Resource and Default in construct paths', () => {
    const logicalId = 'amplifyFunction';
    const metadata = { constructPath: 'MyStack/Auth/Resource' };
    assert.strictEqual(createFriendlyName(logicalId, metadata), 'Auth');
  });

  void it('handles multiple levels of Resource and Default', () => {
    const logicalId = 'amplifyFunction';
    const metadata = { constructPath: 'MyStack/Auth/Default/Resource' };
    assert.strictEqual(createFriendlyName(logicalId, metadata), 'Auth');
  });

  void it('formats camel case with multiple uppercase letters', () => {
    const logicalId = 'amplifyGraphQLAPI123ABC45';
    assert.strictEqual(createFriendlyName(logicalId), 'Graph QLAPI');
  });

  void it('handles complex CloudFormation resource IDs', () => {
    const logicalId = 'TodoIAMRole2DA8E66E';
    assert.strictEqual(createFriendlyName(logicalId), 'Todo IAM Role');
  });

  void it('handles empty construct path', () => {
    const logicalId = 'amplifyFunction';
    const metadata = { constructPath: '' };
    assert.strictEqual(createFriendlyName(logicalId, metadata), 'Function');
  });

  // Examples from documentation
  void it('formats TodoTable correctly', () => {
    const logicalId = 'TodoTable';
    assert.strictEqual(createFriendlyName(logicalId), 'Todo Table');
  });

  void it('formats TodoIAMRole with ID correctly', () => {
    const logicalId = 'TodoIAMRole2DA8E66E';
    assert.strictEqual(createFriendlyName(logicalId), 'Todo IAM Role');
  });

  void it('formats amplifyDataGraphQLAPI with ID correctly', () => {
    const logicalId = 'amplifyDataGraphQLAPI42A6FA33';
    assert.strictEqual(createFriendlyName(logicalId), 'Data Graph QLAPI');
  });

  void it('formats testNameBucketPolicy with ID correctly', () => {
    const logicalId = 'testNameBucketPolicyA5C458BB';
    assert.strictEqual(
      createFriendlyName(logicalId),
      'test Name Bucket Policy',
    );
  });

  void it('handles CDK construct path example', () => {
    const logicalId = 'someLogicalId';
    const metadata = {
      constructPath:
        // eslint-disable-next-line spellcheck/spell-checker
        'amplify-amplifyvitereacttemplate-meghabit-sandbox-83e297d0db/data/modelIntrospectionSchemaBucket/Resource',
    };
    assert.strictEqual(
      createFriendlyName(logicalId, metadata),
      'model Introspection Schema Bucket',
    );
  });

  void it('handles CDK construct path example', () => {
    const logicalId = 'someLogicalId';
    const metadata = {
      constructPath:
        // eslint-disable-next-line spellcheck/spell-checker
        'amplify-amplifyvitereacttemplate-meghabit-sandbox-83e297d0db/data/GraphQLAPI/DefaultApiKey',
    };
    assert.strictEqual(
      createFriendlyName(logicalId, metadata),
      'Default Api Key',
    );
  });
});
