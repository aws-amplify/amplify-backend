// Versions of config schemas supported by this package version
import {
  AuthClientConfigContributor as Auth1,
  DataClientConfigContributor as Data1,
  VersionContributor as VersionContributor1,
} from './client_config_contributor_v1.js';
import {
  AuthClientConfigContributor as Auth2,
  DataClientConfigContributor as Data2,
  VersionContributor as VersionContributor2,
} from './client_config_contributor_v2.js';

import { ClientConfigContributor } from '../client-config-types/client_config_contributor.js';
import { ModelIntrospectionSchemaAdapter } from '../model_introspection_schema_adapter.js';
import { ClientConfigVersion } from '../client-config-types/client_config.js';
/**
 * Factory to generate client config contributors for Gen2 client config schema given a version
 */
export class ClientConfigContributorFactory {
  versionedGen2ClientConfigContributors: Record<
    ClientConfigVersion,
    ClientConfigContributor[]
  >;

  /**
   * Creates a list of all contributors available and caches it.
   */
  constructor(
    private readonly modelIntrospectionSchemaAdapter: ModelIntrospectionSchemaAdapter
  ) {
    this.versionedGen2ClientConfigContributors = {
      ['1']: [
        new Auth1(),
        new Data1(this.modelIntrospectionSchemaAdapter),
        new VersionContributor1(),
      ],
      ['2']: [
        new Auth2(),
        new Data2(this.modelIntrospectionSchemaAdapter),
        new VersionContributor2(),
      ],

      // Legacy config is derived from V1 of Gen2config
      ['0']: [
        new Auth1(),
        new Data1(this.modelIntrospectionSchemaAdapter),
        new VersionContributor1(),
      ],
    };
  }

  /**
   * Return all the contributors for the given version
   */
  getContributors(version: ClientConfigVersion) {
    return this.versionedGen2ClientConfigContributors[version];
  }
}
