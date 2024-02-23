import {
  ResourceAccessAcceptor,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { StorageAction, StoragePath } from './types.js';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';

/**
 * Internal collaborating class for maintaining the relationship between an acceptor token and the access map
 */
export class AccessDefinitionTranslator {
  /**
   * Maintains a mapping of actions for each token
   */
  private acceptorAccessMap = new Map<AcceptorToken, AccessEntry>();

  /**
   * Initialize with a policyFactory
   */
  constructor(private readonly policyFactory: StorageAccessPolicyFactory) {}

  addAccessDefinition = (
    resourceAccessAcceptor: ResourceAccessAcceptor,
    actions: StorageAction[],
    s3Prefix: StoragePath
  ) => {
    const acceptorToken = resourceAccessAcceptor.identifier;

    if (!this.acceptorAccessMap.has(acceptorToken)) {
      this.acceptorAccessMap.set(acceptorToken, {
        policyBuilder: new PolicyBuilder(this.policyFactory),
        acceptor: resourceAccessAcceptor,
      });
    }
    const policyBuilder =
      this.acceptorAccessMap.get(acceptorToken)!.policyBuilder;
    actions.forEach((action) => {
      policyBuilder.add(action, s3Prefix);
    });
  };

  attachPolicies = (ssmEnvironmentEntries: SsmEnvironmentEntry[]) => {
    this.acceptorAccessMap.forEach(({ policyBuilder, acceptor }) => {
      acceptor.acceptResourceAccess(
        policyBuilder.getPolicy(),
        ssmEnvironmentEntries
      );
    });
  };
}

/**
 * Internal collaborating class for maintaining the relationship between actions and resources
 */
class PolicyBuilder {
  private storagePermissions = new Map<
    StorageAction,
    { allow: Set<StoragePath>; deny: Set<StoragePath> }
  >();
  private s3PrefixToActionMap = new Map<StoragePath, Set<StorageAction>>();

  constructor(private readonly policyFactory: StorageAccessPolicyFactory) {}

  /**
   * Set an entry in the actionToResources Map that associates the resource with the action
   */
  add = (action: StorageAction, s3Prefix: StoragePath) => {
    if (!this.storagePermissions.has(action)) {
      this.storagePermissions.set(action, {
        allow: new Set(),
        deny: new Set(),
      });
    }
    this.storagePermissions.get(action)?.allow.add(s3Prefix);

    if (!this.s3PrefixToActionMap.has(s3Prefix)) {
      this.s3PrefixToActionMap.set(s3Prefix, new Set());
    }
    this.s3PrefixToActionMap.get(s3Prefix)?.add(action);
  };

  getPolicy = () => {
    const allPrefixes = Array.from(
      this.s3PrefixToActionMap.keys()
    ) as StoragePath[];

    // do a pass over all the prefixes to determine which parent paths need deny policies for subpaths
    this.s3PrefixToActionMap.forEach((actions, s3Prefix) => {
      const parent = findParent(s3Prefix as StoragePath, allPrefixes);
      if (!parent) {
        // if the current prefix does not have a parent prefix defined, then we don't need to add any deny policies
        // also note there cannot be multiple parent paths because of our path validation rules
        return;
      }
      const parentActions = this.s3PrefixToActionMap.get(parent)!;
      // determine which actions are granted on the parent but not on the subpath
      // these are the actions that need to have a specific deny condition for the subpath
      const denyActions = Array.from(parentActions).filter(
        (parentAction) => !actions.has(parentAction)
      );
      denyActions.forEach((denyAction) => {
        this.storagePermissions.get(denyAction)?.deny.add(s3Prefix);
      });
    });
    return this.policyFactory.createPolicy(this.storagePermissions);
  };
}

const findParent = (prefix: StoragePath, allPrefixes: StoragePath[]) => {
  return allPrefixes.find(
    (p) => prefix !== p && prefix.startsWith(p.replaceAll('*', ''))
  );
};

// some types internal to this file to improve readability

type AcceptorToken = string;

type AccessEntry = {
  policyBuilder: PolicyBuilder;
  acceptor: ResourceAccessAcceptor;
};
