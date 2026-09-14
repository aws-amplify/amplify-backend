const { defineBackend } = require('@aws-amplify/backend');
const { auth } = require('./auth/resource.cjs');
const { storage } = require('./storage/resource.cjs');
const { myFunc } = require('./function.cjs');
const { data } = require('./data/resource.cjs');

defineBackend({
  auth,
  storage,
  myFunc,
  data,
});
