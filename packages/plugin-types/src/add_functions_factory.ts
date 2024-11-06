import { AmplifyFunction } from './amplify_function';
import { ConstructFactory } from './construct_factory';

export type AddFunctionsFactory = {
  addFunctions: (functions: ConstructFactory<AmplifyFunction>[]) => void;
};
