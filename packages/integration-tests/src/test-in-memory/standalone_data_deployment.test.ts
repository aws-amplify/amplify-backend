import { it } from 'node:test';
import assert from 'node:assert';
import { synthesizeStandaloneBackendTemplates } from '../define_backend_template_harness.js';
import { dataWithoutAuth } from '../test-projects/standalone-data-auth-modes/amplify/test_factories.js';

/**
 * Verifies that defineData works under standalone deployment type.
 * This confirms that data-construct handles the standalone context value.
 */
void it('standalone deployment with data (no auth)', () => {
  const templates = synthesizeStandaloneBackendTemplates(dataWithoutAuth);

  assert.ok(templates.root, 'should produce a root template');
  assert.ok(templates.data, 'should produce a data template');

  // Verify no Amplify Hosting resources
  assert.strictEqual(
    Object.keys(templates.root.findResources('AWS::Amplify::App')).length,
    0,
    'should not contain AWS::Amplify::App resources',
  );
  assert.strictEqual(
    Object.keys(templates.root.findResources('AWS::Amplify::Branch')).length,
    0,
    'should not contain AWS::Amplify::Branch resources',
  );
});
