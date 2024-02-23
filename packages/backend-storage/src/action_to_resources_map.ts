import { ResourceAccessAcceptor } from '@aws-amplify/plugin-types';
import { StorageAction, StoragePrefix } from './types.js';

/**
 * Internal collaborating class for maintaining the relationship between an acceptor token and the access map
 */
export class AcceptorTokenAccessMap {
  /**
   * Maintains a mapping of actions for each token
   */
  private acceptorTokenAccessMap = new Map<AcceptorToken, AccessEntry>();

  set = (
    resourceAccessAcceptor: ResourceAccessAcceptor,
    actions: StorageAction[],
    s3Prefix: StoragePrefix
  ) => {
    const acceptorToken = resourceAccessAcceptor.identifier;

    if (!this.acceptorTokenAccessMap.has(acceptorToken)) {
      this.acceptorTokenAccessMap.set(acceptorToken, {
        actionMap: new S3PrefixActionBiDiMap(),
        acceptor: resourceAccessAcceptor,
      });
    }
    const actionMap = this.acceptorTokenAccessMap.get(acceptorToken)!.actionMap;
    actions.forEach((action) => {
      actionMap.set(action, s3Prefix);
    });
  };

  getAccessList = () => {
    const result: AccessEntry[] = [];
    this.acceptorTokenAccessMap.forEach((value) => {
      result.push(value);
    });
    return result as Readonly<Readonly<AccessEntry>[]>;
  };
}

/**
 * Internal collaborating class for maintaining the relationship between actions and resources
 */
class S3PrefixActionBiDiMap {
  private actionToS3PrefixMap: StoragePermissions = new Map();
  private s3PrefixToActionMap = new Map<StoragePrefix, Set<StorageAction>>();

  /**
   * Set an entry in the actionToResources Map that associates the resource with the action
   */
  set = (action: StorageAction, s3Prefix: StoragePrefix) => {
    if (!this.actionToS3PrefixMap.has(action)) {
      this.actionToS3PrefixMap.set(action, {
        allow: new Set(),
        deny: new Set(),
      });
    }
    this.actionToS3PrefixMap.get(action)?.allow.add(s3Prefix);

    if (!this.s3PrefixToActionMap.has(s3Prefix)) {
      this.s3PrefixToActionMap.set(s3Prefix, new Set());
    }
    this.s3PrefixToActionMap.get(s3Prefix)?.add(action);
  };

  getActionToS3PrefixMap = () => {
    // do a pass over all the prefixes to determine which parent paths need deny policies for subpaths
    const allPrefixes = Array.from(
      this.s3PrefixToActionMap.keys()
    ) as StoragePrefix[];
    this.s3PrefixToActionMap.forEach((actions, s3Prefix) => {
      const parent = this.findParent(s3Prefix as StoragePrefix, allPrefixes);
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
        this.actionToS3PrefixMap.get(denyAction)?.deny.add(s3Prefix);
      });
    });
    return this.actionToS3PrefixMap;
  };

  private findParent = (
    prefix: StoragePrefix,
    allPrefixes: StoragePrefix[]
  ) => {
    return allPrefixes.find(
      (p) => prefix !== p && prefix.startsWith(p.replaceAll('*', ''))
    );
  };
}

// some types internal to this file to improve readability

type AcceptorToken = string;

type AccessEntry = {
  actionMap: S3PrefixActionBiDiMap;
  acceptor: ResourceAccessAcceptor;
};

export type StoragePermissions = Map<
  StorageAction,
  { allow: Set<StoragePrefix>; deny: Set<StoragePrefix> }
>;
