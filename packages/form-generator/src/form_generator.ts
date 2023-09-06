export interface FormGenerator<T = void> {
  generateForms: () => Promise<T>;
}
