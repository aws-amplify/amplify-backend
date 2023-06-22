import { ConstructFactory } from './construct_factory.js';
import { Construct } from 'constructs';

export type ProviderFactory<T = unknown> = {
  provides: string;
} & ConstructFactory<T & Construct>;
