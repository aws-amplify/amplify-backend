import snakeCase from 'lodash.snakecase';

/**
 * Naming Converter
 * @example
 * new NamingConverter().toScreamingSnakeCase('myInputString')
 */
export class NamingConverter {
  /**
   * Converts input string to SCREAMING_SNAKE_CASE
   * @param input Input string to convert
   */
  public toScreamingSnakeCase(input: string): string {
    return snakeCase(input).toUpperCase();
  }
}
