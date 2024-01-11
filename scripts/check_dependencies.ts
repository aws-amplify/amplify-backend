import { glob } from 'glob';
import { DependenciesValidator } from './components/dependencies_validator.js';

await new DependenciesValidator(
  await glob('packages/*'),
  {
    'aws-amplify': { denyAll: true },
    '@aws-amplify/datastore': { denyAll: true },
    '@aws-amplify/core': { denyAll: true },
    '@aws-amplify/cli-core': {
      allowList: [
        '@aws-amplify/backend-cli',
        '@aws-amplify/sandbox',
        'create-amplify',
      ],
    },
  },
  [['aws-cdk', 'aws-cdk-lib']]
).validate();
