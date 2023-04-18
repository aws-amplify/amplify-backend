#!/usr/bin/env node

import { helloWorld } from '@aws-amplify/lib-synth';

/**
 * Entry point
 */
const main = () => {
  helloWorld(console.log);
};

main();
