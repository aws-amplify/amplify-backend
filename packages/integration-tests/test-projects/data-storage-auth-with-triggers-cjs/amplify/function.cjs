'use strict';

const { defineFunction } = require('@aws-amplify/backend');

const myFunc = defineFunction({
  entry: './func-src/handler.cjs',
});

module.exports = { myFunc };
