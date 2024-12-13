import snakeCase from 'lodash.snakecase';

/**
 * Converts input string to SCREAMING_SNAKE_CASE
 */
export const toScreamingSnakeCase = (input: string): string => {
  return snakeCase(input).toUpperCase();
};
