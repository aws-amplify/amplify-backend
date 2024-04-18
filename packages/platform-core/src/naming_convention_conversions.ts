/**
 * Converts input string to SCREAMING_SNAKE_CASE
 */
export const toScreamingSnakeCase = (input: string): string => {
  return (
    input
      .match(
        /[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g
      )
      ?.join('_')
      .toUpperCase() ?? input
  );
};
