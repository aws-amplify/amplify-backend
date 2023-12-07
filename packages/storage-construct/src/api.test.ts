import { AmplifyStorage, AmplifyStorageProps } from './construct.js';
import { Construct } from 'constructs';
import { BackendOutputStorageStrategy } from '@aws-amplify/plugin-types';
import { StorageOutput } from '@aws-amplify/backend-output-schemas';

const minApiUsage = async (scope: Construct, id: string) => {
  const props: AmplifyStorageProps = {};
  new AmplifyStorage(scope, id, props);
  const asConstruct: Construct = new AmplifyStorage(scope, id, props);
};

const maxApiUsage = async (
  scope: Construct,
  id: string,
  outputStorageStrategy: BackendOutputStorageStrategy<StorageOutput>
) => {
  const props: AmplifyStorageProps = {
    versioned: true,
    outputStorageStrategy,
  };
  new AmplifyStorage(scope, id, props);
};
