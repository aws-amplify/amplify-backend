import { parse } from 'graphql';

/**
 * Determines whether a generated GraphQL statements document contains no
 * executable definitions (i.e. it is "empty").
 *
 * The code generation formatter always prepends an auto-generated header
 * comment to every `<operation>.graphql` statements document. When a schema's
 * operations for a given operation type are entirely backed by `@function`
 * resolvers — or when an operation type (commonly `subscriptions`, which has no
 * auto-generated operations without `@model` types) produces nothing — the
 * resulting document contains only that header comment. A comment-only or
 * whitespace-only document cannot be parsed by `graphql.parse`; it throws
 * `Syntax Error: Unexpected <EOF>`, which otherwise aborts the entire
 * client-code generation.
 *
 * Skipping these empty documents lets codegen succeed for schemas that rely on
 * `@function` resolvers.
 * See https://github.com/aws-amplify/amplify-backend/issues/3280.
 * @param document - raw contents of a generated GraphQL statements document.
 * @returns `true` when the document has no executable definitions and should be
 * skipped; `false` when it contains at least one definition. Genuinely
 * malformed (non-empty) documents are reported as non-empty so their underlying
 * parse error surfaces downstream instead of being silently dropped.
 */
export const isEmptyGraphqlDocument = (document: string): boolean => {
  try {
    return parse(document).definitions.length === 0;
  } catch {
    return stripGraphqlComments(document).trim().length === 0;
  }
};

const stripGraphqlComments = (document: string): string =>
  document
    .split('\n')
    .map((line) => line.replace(/#.*$/, ''))
    .join('\n');
