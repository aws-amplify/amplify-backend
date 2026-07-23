import { it } from 'node:test';
import assert from 'node:assert';
import { synthesizeStandaloneBackendTemplates } from '../define_backend_template_harness.js';
import { standaloneAuthWithWebAuthn } from '../test-projects/standalone-auth/amplify/test_factories.js';

/**
 * Verifies that defineBackend with DEPLOYMENT_TYPE=standalone and an explicit
 * WebAuthn relyingPartyId produces correct CloudFormation templates.
 */
void it('standalone deployment with explicit WebAuthn relyingPartyId', () => {
  const templates = synthesizeStandaloneBackendTemplates(
    standaloneAuthWithWebAuthn,
  );

  assert.ok(templates.root, 'should produce a root template');
  assert.ok(templates.auth, 'should produce an auth template');

  const nestedStacks = templates.root.findResources(
    'AWS::CloudFormation::Stack',
  );
  assert.ok(
    Object.keys(nestedStacks).length > 0,
    'should have at least one nested stack',
  );

  // Auth template should have the explicit relyingPartyId
  templates.auth.hasResourceProperties('AWS::Cognito::UserPool', {
    WebAuthnRelyingPartyID: 'app.example.com',
  });

  // Verify no Amplify Hosting artifacts in standalone templates
  const rootJson = JSON.stringify(templates.root.toJSON());
  assert.ok(
    !rootJson.includes('amplifyapp.com'),
    'root template should not reference amplifyapp.com',
  );
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
