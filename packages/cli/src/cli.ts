#!/usr/bin/env node

import { helloWorld } from '@aws-amplify/lib-synth';

const main = () => {
  helloWorld(console.log);
};

main();
