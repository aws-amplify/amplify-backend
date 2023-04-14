#!/usr/bin/env node

import { helloWorld } from './hello_world.js';

const main = () => {
  helloWorld(console.log);
};

main();
