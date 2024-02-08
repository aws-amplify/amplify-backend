import {
  RoleAccessBuilder,
  StorageAccessDefinition,
} from './access_builder.js';
import { AmplifyStorageProps } from './construct.js';

/**
 * Storage access keys must start with / and end with /*
 */
export type StoragePrefix = `/${string}/*`;

export type AmplifyStorageFactoryProps = Omit<
  AmplifyStorageProps,
  'outputStorageStrategy'
> & {
  access?: AccessGenerator;
};

export type AccessGenerator = (
  allow: RoleAccessBuilder
) => Record<StoragePrefix, StorageAccessDefinition[]>;
