// Versions of config schemas supported by this package version
import {
  AuthClientConfigContributor as Auth1,
  CustomClientConfigContributor as Custom1,
  DataClientConfigContributor as Data1,
  StorageClientConfigContributor as Storage1,
  VersionContributor as VersionContributor1,
} from './client_config_contributor_v1.js';

import { ClientConfigContributor } from '../client-config-types/client_config_contributor.js';
import { ModelIntrospectionSchemaAdapter } from '../model_introspection_schema_adapter.js';
import {
  ClientConfigVersion,
  ClientConfigVersionOption,
} from '../client-config-types/client_config.js';
/**
 * Factory to generate client config contributors for client config schema given a version
 */
export class ClientConfigContributorFactory {
  versionedClientConfigContributors: Record<
    ClientConfigVersion,
    ClientConfigContributor[]
  >;

  /**
   * Creates a list of all contributors available and caches it.
   */
  constructor(
    private readonly modelIntrospectionSchemaAdapter: ModelIntrospectionSchemaAdapter
  ) {
    this.versionedClientConfigContributors = {
      [ClientConfigVersionOption.V1]: [
        new Auth1(),
        new Data1(this.modelIntrospectionSchemaAdapter),
        new Storage1(),
        new VersionContributor1(),
        new Custom1(),
      ],

      // Legacy config is derived from V1 of unified default config
      [ClientConfigVersionOption.V0]: [
        new Auth1(),
        new Data1(this.modelIntrospectionSchemaAdapter),
        new Storage1(),
        new VersionContributor1(),
        new Custom1(),
      ],
    };
  }

  /**
   * Return all the contributors for the given version
   */
  getContributors(version: ClientConfigVersion) {
    return this.versionedClientConfigContributors[version];
  }
}
