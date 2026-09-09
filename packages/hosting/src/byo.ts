// Bring-your-own (BYO) references for self-managed hosting values. These let a
// `defineHosting` user point `environment` at an EXISTING AWS Secrets Manager
// secret or SSM parameter WITHOUT writing CDK — `defineHosting` resolves the
// reference to an `ISecret`/`IParameter` internally, using the scope it owns, and
// hands the real handle to the hosting construct (which grants read + injects the
// locator, exactly as for `secret()`/`config()`). This closes the gap where BYO
// previously required calling the construct directly to build the handle.
//
// This module is CDK-free (just an inert marker); the CDK resolution happens in
// `factory.ts` where the construct scope exists.

/** Inert marker describing an existing store entry to wire into `environment`. */
export type ByoValue = {
  /**
   * Discriminant identifying a BYO marker produced by {@link byoSecret} /
   * {@link byoConfig}. A literal-typed property (rather than a `unique symbol`
   * key) so the exported type is self-contained in the generated API report.
   */
  readonly byoBrand: true;
  /** `secret` → Secrets Manager, `config` → SSM Parameter Store. */
  readonly kind: 'secret' | 'config';
  /** The secret name/ARN (secret) or parameter name (config; ARNs not accepted). */
  readonly ref: string;
};

/**
 * Reference an EXISTING AWS Secrets Manager secret by name or ARN, to wire into
 * `defineHosting`'s `environment`. Read at runtime with `getSecret('<key>')`.
 * @param secretNameOrArn - the secret's name (e.g. `my/app/token`) or full ARN.
 * @example
 * ```ts
 * defineHosting({ environment: { LEGACY_TOKEN: byoSecret('my/app/legacy-token') } });
 * // → getSecret('LEGACY_TOKEN')
 * ```
 */
export const byoSecret = (secretNameOrArn: string): ByoValue => ({
  byoBrand: true,
  kind: 'secret',
  ref: secretNameOrArn,
});

/**
 * Reference an EXISTING SSM parameter by name, to wire into `defineHosting`'s
 * `environment`. Read at runtime with `getConfig('<key>')`. Unlike
 * {@link byoSecret}, this takes a parameter **name**, not an ARN (SSM parameters
 * are resolved by name).
 * @param parameterName - the parameter's name (e.g. `/my/app/flags`).
 */
export const byoConfig = (parameterName: string): ByoValue => ({
  byoBrand: true,
  kind: 'config',
  ref: parameterName,
});

/** Type guard: a BYO marker produced by {@link byoSecret} / {@link byoConfig}. */
export const isByoValue = (v: unknown): v is ByoValue =>
  typeof v === 'object' &&
  v !== null &&
  (v as Record<string, unknown>).byoBrand === true;
