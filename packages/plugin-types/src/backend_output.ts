export type BackendOutputEntry<
  T extends Record<string, string> = Record<string, string>
> = {
  readonly version: string;
  readonly payload: T;
};

/**
 * This interface is the same as BackendOutputEntry above but without the generic type
 * This is because it is used by JSII classes which does not support generics
 */
export interface GenericBackendOutputEntry {
  readonly version: string;
  readonly payload: Record<string, string>;
}

export type BackendOutput = Record<string, BackendOutputEntry>;
