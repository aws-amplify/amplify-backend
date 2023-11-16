'use strict';

const { Func } = require('@aws-amplify/backend');

const myFunc = Func.fromDir({
  name: 'testFunc',
  codePath: './func-src',
});

module.exports = { myFunc };
