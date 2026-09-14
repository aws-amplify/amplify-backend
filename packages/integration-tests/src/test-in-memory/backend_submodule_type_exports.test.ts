/**
 * If this "test" builds, then it means that these types are available in the types/platform submodule export from @aws-amplify/backend
 */
import {
  AuthCfnResources,
  AuthResources,
  AuthRoleName,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
  BackendSecretResolver,
  ConstructContainer,
  ConstructContainerEntryGenerator,
  ConstructFactory,
  ConstructFactoryGetInstanceProps,
  FunctionResources,
  GenerateContainerEntryProps,
  ImportPathVerifier,
  ResourceProvider,
  SsmEnvironmentEntriesGenerator,
  SsmEnvironmentEntry,
} from '@aws-amplify/backend/types/platform';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type UseAllTheThings = {
  thing1?: AuthCfnResources;
  thing2?: AuthResources;
  thing3?: AuthRoleName;
  thing4?: BackendOutputEntry;
  thing5?: BackendOutputStorageStrategy<BackendOutputEntry>;
  thing6?: BackendSecretResolver;
  thing7?: ConstructContainer;
  thing8?: ConstructContainerEntryGenerator;
  thing9?: ConstructFactory;
  thing10?: ConstructFactoryGetInstanceProps;
  thing11?: FunctionResources;
  thing12?: GenerateContainerEntryProps;
  thing13?: ImportPathVerifier;
  thing14?: ResourceProvider;
  thing15?: SsmEnvironmentEntriesGenerator;
  thing16?: SsmEnvironmentEntry;
};
