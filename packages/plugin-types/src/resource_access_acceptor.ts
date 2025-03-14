import { Policy } from 'aws-cdk-lib/aws-iam';

export type SsmEnvironmentEntry = {
  /**
   * The environment variable name where this SSM value will be placed at runtime
   */
  name: string;
  /**
   * The SSM parameter path that will be fetched at runtime
   */
  path: string;
};

export type ResourceAccessAcceptor = {
  /**
   * String used to uniquely identify this acceptor. Each instance should have it's own identifier.
   */
  identifier: string;
  acceptResourceAccess: (
    policy: Policy,
    ssmEnvironmentEntries: SsmEnvironmentEntry[],
  ) => void;
};

export type ResourceAccessAcceptorFactory<
  RoleIdentifier extends string | undefined = undefined,
> = {
  /**
   * This type is a little wonky but basically it's saying that if RoleIdentifier is undefined, then this is a function with no props
   * And if RoleIdentifier is a string then this is a function with a single roleIdentifier prop
   * See https://github.com/Microsoft/TypeScript/pull/24897
   */
  getResourceAccessAcceptor: (
    ...roleIdentifier: RoleIdentifier extends string ? [RoleIdentifier] : []
  ) => ResourceAccessAcceptor;
};
