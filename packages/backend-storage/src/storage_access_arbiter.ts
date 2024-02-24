import {
  ResourceAccessAcceptor,
  SsmEnvironmentEntry,
} from '@aws-amplify/plugin-types';
import { StorageAction, StoragePath } from './types.js';
import { StorageAccessPolicyFactory } from './storage_access_policy_factory.js';

// some types internal to this file to improve readability
type AcceptorToken = string;
type SetDenyByDefault = (storagePath: StoragePath) => void;

/**
 * Internal collaborating class for building up mappings of the actions and s3 prefix resource scopes that should be granted to each ResourceAccessAcceptors.
 * This class maintains two different data structures on top of the same underlying values.
 * The first is a "forward map" of the allow/deny rules for each access acceptor
 * The second if a "reverse map" of a "DenyByDefault" callback list for each s3 prefix that has been seen.
 * This callback is used during a final pass over all of the rules to update the forward map with deny rules on any paths that do not have explicit allow rules
 */
export class StorageAccessArbiter {
  /**
   * Maintains a mapping from a resource access acceptor to all of the access grants it has been configured with
   * Each entry of this map is fed into the policy generator to create a single policy for each acceptor
   */
  private acceptorAccessMap = new Map<
    AcceptorToken,
    {
      acceptor: ResourceAccessAcceptor;
      accessMap: Map<
        StorageAction,
        { allow: Set<StoragePath>; deny: Set<StoragePath> }
      >;
    }
  >();

  /**
   * Maintains pointers to the "deny" StoragePath Set for each access entry in the map above
   * This map is used during a final pass over all the StoragePaths to deny access on any paths where explicit allow rules were not specified
   */
  private prefixDenyMap = new Map<StoragePath, SetDenyByDefault[]>();

  /**
   * Initialize with a policyFactory.
   * The policyFactory is the component that actually knows how to construct IAM policies.
   * This class only manages the defineStorage access pattern abstraction
   */
  constructor(private readonly policyFactory: StorageAccessPolicyFactory) {}

  /**
   * Update the translator with an access definition.
   * This definition defines a set of actions on a single s3 prefix that should be attached to a given ResourceAccessAcceptor
   */
  addAccessDefinition = (
    resourceAccessAcceptor: ResourceAccessAcceptor,
    actions: StorageAction[],
    s3Prefix: StoragePath
  ) => {
    const acceptorToken = resourceAccessAcceptor.identifier;

    // if we haven't seen this token before, add it to the map
    if (!this.acceptorAccessMap.has(acceptorToken)) {
      this.acceptorAccessMap.set(acceptorToken, {
        accessMap: new Map(),
        acceptor: resourceAccessAcceptor,
      });
    }
    const accessMap = this.acceptorAccessMap.get(acceptorToken)!.accessMap;
    // add each action to the accessMap for this acceptorToken
    actions.forEach((action) => {
      if (!accessMap.has(action)) {
        // if we haven't seen this action for this acceptorToken before, add it to the map
        const allowSet = new Set<StoragePath>([s3Prefix]);
        const denySet = new Set<StoragePath>();
        accessMap.set(action, { allow: allowSet, deny: denySet });

        // this is where we create the reverse mapping that allows us to add entries to the denySet later by looking up the prefix
        this.setPrefixDenyMapEntry(s3Prefix, allowSet, denySet);
      } else {
        // otherwise add the prefix to the existing allow set
        accessMap.get(action)?.allow.add(s3Prefix);
      }
    });
  };

  /**
   * Iterates over all of the access definitions that have been added to the translator,
   * generates a policy for each accessMap,
   * and attaches the policy to the corresponding ResourceAccessAcceptor
   *
   * After this method is called, the existing access definition state is cleared.
   * This prevents multiple calls to this method from producing duplicate policies.
   * The class can continue to be used to build up state for a new set of policies if desired.
   * @param ssmEnvironmentEntries Additional SSM context that is passed to each ResourceAccessAcceptor
   */
  attachPolicies = (ssmEnvironmentEntries: SsmEnvironmentEntry[]) => {
    const allPaths = Array.from(this.prefixDenyMap.keys());
    allPaths.forEach((storagePath) => {
      const parent = findParent(storagePath, allPaths);
      if (!parent) {
        return;
      }
      // if a parent path is defined, invoke the denyByDefault callback on this subpath for all policies that exist on the parent path
      this.prefixDenyMap
        .get(parent)
        ?.forEach((denyByDefaultCallback) =>
          denyByDefaultCallback(storagePath)
        );
    });

    this.acceptorAccessMap.forEach(({ acceptor, accessMap }) => {
      acceptor.acceptResourceAccess(
        this.policyFactory.createPolicy(accessMap),
        ssmEnvironmentEntries
      );
    });
    this.acceptorAccessMap.clear();
    this.prefixDenyMap.clear();
  };

  private setPrefixDenyMapEntry = (
    storagePath: StoragePath,
    allowPathSet: Set<StoragePath>,
    denyPathSet: Set<StoragePath>
  ) => {
    // function that will add the denyPath to the denyPathSet unless the allowPathSet explicitly allows the path
    const setDenyByDefault = (denyPath: StoragePath) => {
      if (!allowPathSet.has(denyPath)) {
        denyPathSet.add(denyPath);
      }
    };
    if (!this.prefixDenyMap.has(storagePath)) {
      this.prefixDenyMap.set(storagePath, [setDenyByDefault]);
    } else {
      this.prefixDenyMap.get(storagePath)?.push(setDenyByDefault);
    }
  };
}

/**
 * Returns the element in paths that is a prefix of path, if any
 * Note that there can only be one at this point because of upstream validation
 */
const findParent = (path: string, paths: string[]) =>
  paths.find((p) => path !== p && path.startsWith(p.replaceAll('*', ''))) as
    | StoragePath
    | undefined;
