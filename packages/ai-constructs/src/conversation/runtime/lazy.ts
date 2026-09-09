/**
 * A class that initializes lazily upon usage.
 */
export class Lazy<T> {
  #value?: T;

  /**
   * Creates lazy instance.
   */
  constructor(private readonly valueFactory: () => T) {}
  /**
   * Gets a value. Value is create at first access.
   */
  public get value(): T {
    return (this.#value ??= this.valueFactory());
  }
}
