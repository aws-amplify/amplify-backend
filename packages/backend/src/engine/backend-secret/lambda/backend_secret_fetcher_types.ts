import { BackendIdentifier } from '@aws-amplify/plugin-types';

export type SecretResourceProps = Omit<BackendIdentifier, 'hash'> & {
  secretName: string;
};
