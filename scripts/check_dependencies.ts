import { glob } from 'glob';
import { DependenciesValidator } from './components/dependencies_validator.js';

await new DependenciesValidator( //**the structure of this comes from dependencies_validator.ts
  await glob('packages/*'),
  {
    'aws-amplify': {
      allowList: ['@aws-amplify/integration-tests'],
    },
    '@aws-amplify/datastore': {
      allowList: ['@aws-amplify/integration-tests'],
    },
    '@aws-amplify/core': {
      allowList: ['@aws-amplify/integration-tests'],
    },
    '@aws-amplify/cli-core': {
      allowList: [
        '@aws-amplify/backend-cli',
        '@aws-amplify/sandbox',
        'create-amplify',
      ],
    },
  },
  [['aws-cdk', 'aws-cdk-lib']],
  [
    {
      dependencyName: 'execa',
      globalDependencyVersion: '^8.0.1',
      exceptions: [
        {
          packageName: '@aws-amplify/plugin-types',
          dependencyVersion: '^5.1.1',
        },
      ],
    },
  ]
).validate();
