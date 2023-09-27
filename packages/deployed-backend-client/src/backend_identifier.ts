import { UniqueBackendIdentifier } from '@aws-amplify/plugin-types';
import { StackIdentifier } from './stack-name-resolvers/passthrough_main_stack_name_resolver.js';
import { AppNameAndBranchBackendIdentifier } from './stack-name-resolvers/app_name_and_branch_main_stack_name_resolver.js';
export type BackendIdentifier =
  | UniqueBackendIdentifier
  | StackIdentifier
  | AppNameAndBranchBackendIdentifier;
