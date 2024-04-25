/**
 * Implementors can validate what should be the correct resource name
 */
export type ResourceNameValidator = {
  /**
   * executes the validation
   */
  validate: (resourceName: string) => void;
};
