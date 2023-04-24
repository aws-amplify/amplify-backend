#!/usr/bin/env node

import { helloWorld } from '@aws-amplify/lib-synth';

/**
 * CLI entry point
 */
export const main = () => {
  helloWorld(console.log);
};

main();
