// Versions of config schemas supported by this package version
import {
  AuthClientConfigContributorV1_1 as Auth1_1,
  AuthClientConfigContributor as Auth1_3,
  CustomClientConfigContributor as Custom1_1,
  DataClientConfigContributor as Data1_1,
  StorageClientConfigContributorV1 as Storage1,
  StorageClientConfigContributorV1_1 as Storage1_1,
  StorageClientConfigContributor as Storage1_2,
  VersionContributor as VersionContributor1_3,
  VersionContributorV1,
  VersionContributorV1_1,
  VersionContributorV1_2,
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
      [ClientConfigVersionOption.V1_3]: [
        new Auth1_3(),
        new Data1_1(this.modelIntrospectionSchemaAdapter),
        new Storage1_2(),
        new VersionContributor1_3(),
        new Custom1_1(),
      ],

      [ClientConfigVersionOption.V1_2]: [
        new Auth1_1(),
        new Data1_1(this.modelIntrospectionSchemaAdapter),
        new Storage1_2(),
        new VersionContributorV1_2(),
        new Custom1_1(),
      ],

      [ClientConfigVersionOption.V1_1]: [
        new Auth1_1(),
        new Data1_1(this.modelIntrospectionSchemaAdapter),
        new Storage1_1(),
        new VersionContributorV1_1(),
        new Custom1_1(),
      ],

      // Except for storage and version, other contributors are same as V1
      [ClientConfigVersionOption.V1]: [
        new Auth1_1(),
        new Data1_1(this.modelIntrospectionSchemaAdapter),
        new Storage1(),
        new VersionContributorV1(),
        new Custom1_1(),
      ],

      // Legacy config is derived from V1.3 (latest) of unified default config
      [ClientConfigVersionOption.V0]: [
        new Auth1_1(),
        new Data1_1(this.modelIntrospectionSchemaAdapter),
        new Storage1_2(),
        new VersionContributor1_3(),
        new Custom1_1(),
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
