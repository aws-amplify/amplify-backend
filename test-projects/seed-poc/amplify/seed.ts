// TODO: importing as type doesn't trigger synthesis, otherwise it does and it's failing.
// Synthesis is not needed for seed, seed depends on post-deployment artifacts (client config).
import type { backend } from './backend';

let foo: typeof backend;
