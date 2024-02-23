import { ResourceAccessAcceptor } from '@aws-amplify/plugin-types';
import { StorageAction, StoragePath } from './types.js';

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
    s3Prefix: S3Prefix
  ) => {
    const acceptorToken = resourceAccessAcceptor.identifier;

    if (!this.acceptorTokenAccessMap.has(acceptorToken)) {
      this.acceptorTokenAccessMap.set(acceptorToken, {
        actionMap: new S3PrefixActionMap(),
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
class S3PrefixActionMap {
  private actionToResourcesMap = new Map<StorageAction, Set<S3Prefix>>();

  /**
   * Set an entry in the actionToResources Map that associates the resource with the action
   */
  set = (action: StorageAction, s3Prefix: S3Prefix) => {
    if (!this.actionToResourcesMap.has(action)) {
      this.actionToResourcesMap.set(action, new Set());
    }
    this.actionToResourcesMap.get(action)?.add(s3Prefix);
  };

  getActionToResourcesMap = () => {
    return this.actionToResourcesMap as Readonly<
      Map<StorageAction, Readonly<Set<StoragePath>>>
    >;
  };
}

// some types internal to this file to improve readability

type AcceptorToken = string;
type S3Prefix = string;

type AccessEntry = {
  actionMap: S3PrefixActionMap;
  acceptor: ResourceAccessAcceptor;
};
