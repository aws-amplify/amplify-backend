import { glob } from 'glob';
import { DependenciesValidator } from './components/dependencies_validator.js';

await new DependenciesValidator(
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
      // @aws-amplify/plugin-types can depend on execa@^5.1.1 as a workaround for https://github.com/aws-amplify/amplify-backend/issues/962
      // all other packages must depend on execa@^8.0.1
      // this can be removed once execa is patched
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
