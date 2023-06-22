import { ConstructFactory } from './construct_factory.js';
import { Construct } from 'constructs';

/**
 * ProviderFactory is a stricter version of ConstructFactory that asserts that the returned construct conforms to an additional type.
 * The ProviderFactory must also announce itself to the platform via the "provides" key.
 * This key becomes the token by which consumers can find this provider
 */
export type ProviderFactory<T = unknown> = {
  provides: string;
} & ConstructFactory<T & Construct>;
