import { parse } from 'graphql';

/**
 * Returns `true` for empty / whitespace-only / comment-only GraphQL statement
 * documents, which must be skipped before parsing to avoid `Unexpected <EOF>`.
 * Genuinely malformed non-empty documents return `false` so their real parse
 * error still surfaces downstream.
 * @see https://github.com/aws-amplify/amplify-backend/issues/3280
 */
export const isEmptyGraphqlDocument = (document: string): boolean => {
  try {
    parse(document);
    return false; // a successfully parsed doc has >=1 definition by spec
  } catch {
    return stripGraphqlComments(document).trim().length === 0;
  }
};

const stripGraphqlComments = (document: string): string =>
  document
    .split('\n')
    .map((line) => line.replace(/#.*$/, ''))
    .join('\n');
