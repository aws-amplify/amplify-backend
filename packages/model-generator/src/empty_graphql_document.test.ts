import assert from 'assert';
import { describe, it } from 'node:test';
import { isEmptyGraphqlDocument } from './empty_graphql_document.js';

// The exact document the code generation formatter emits for an operation type
// that has no auto-generated operations (e.g. `subscriptions` for a schema
// whose operations are all backed by `@function` resolvers). Handing this
// comment-only document to the GraphQL parser throws `Unexpected <EOF>` and
// aborts client-code generation (aws-amplify/amplify-backend#3280).
const COMMENT_ONLY_DOCUMENT =
  '# this is an auto generated file. This will be overwritten\n\n\n';

void describe('isEmptyGraphqlDocument', () => {
  void it('treats the comment-only codegen document as empty', () => {
    assert.strictEqual(isEmptyGraphqlDocument(COMMENT_ONLY_DOCUMENT), true);
  });

  void it('treats an empty string as empty', () => {
    assert.strictEqual(isEmptyGraphqlDocument(''), true);
  });

  void it('treats a whitespace-only document as empty', () => {
    assert.strictEqual(isEmptyGraphqlDocument('\n\n\n'), true);
    assert.strictEqual(isEmptyGraphqlDocument('   \t  \n'), true);
  });

  void it('treats a document with only comments as empty', () => {
    assert.strictEqual(
      isEmptyGraphqlDocument('# a comment\n# another comment\n'),
      true,
    );
  });

  void it('treats a document with an executable operation as non-empty', () => {
    const document =
      '# this is an auto generated file. This will be overwritten\n\n' +
      'query GetThing($id: ID!) {\n  getThing(id: $id)\n}\n';
    assert.strictEqual(isEmptyGraphqlDocument(document), false);
  });

  void it('treats a document with multiple definitions as non-empty', () => {
    const document = `
      query GetThing($id: ID!) {
        getThing(id: $id)
      }
      mutation DoThing($foo: String!) {
        doThing(foo: $foo) {
          bar
        }
      }
    `;
    assert.strictEqual(isEmptyGraphqlDocument(document), false);
  });

  void it('reports a malformed but non-empty document as non-empty so the underlying parse error can surface downstream', () => {
    // This is not a valid operation, but it is not "empty" either. Reporting it
    // as non-empty keeps it in the pipeline so the real parse error is raised
    // rather than being silently dropped.
    const document = 'query GetThing($id: ID!) { getThing(id: $id';
    assert.strictEqual(isEmptyGraphqlDocument(document), false);
  });
});
