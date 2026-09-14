import { glob } from 'glob';
import { DependenciesValidator } from './components/dependencies_validator.js';

await new DependenciesValidator(
  await glob('packages/*'),
  {
    'aws-amplify': {
      allowList: ['@aws-amplify/integration-tests', '@aws-amplify/seed'],
    },
    '@aws-amplify/datastore': {
      allowList: ['@aws-amplify/integration-tests', '@aws-amplify/seed'],
    },
    '@aws-amplify/core': {
      allowList: ['@aws-amplify/integration-tests', '@aws-amplify/seed'],
    },
    '@aws-amplify/cli-core': {
      allowList: [
        '@aws-amplify/backend-cli',
        '@aws-amplify/integration-tests',
        '@aws-amplify/sandbox',
        '@aws-amplify/seed',
        'create-amplify',
      ],
    },
  },
  [], // Add a list of dependencies here that should be versioned together
  [],
).validate();
