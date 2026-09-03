import { getHostingStorePrefixes } from '@aws-amplify/hosting/store-paths';
import {
  CreateSecretCommand,
  DeleteSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  PutSecretValueCommand,
  ResourceNotFoundException,
  SecretsManagerClient,
} from '@aws-sdk/client-secrets-manager';
import {
  DeleteParameterCommand,
  GetParameterCommand,
  GetParametersByPathCommand,
  ParameterNotFound,
  PutParameterCommand,
  SSMClient,
} from '@aws-sdk/client-ssm';
import {
  type SecretStore,
  type ValueKind,
  secretStoreLocator,
} from '@aws-blocks/hosting';

// Kind → backing store. Mirrors `@aws-blocks/hosting`'s internal `storeForKind`
// (not re-exported from the package root): `secret` → Secrets Manager,
// `config` → SSM Parameter Store.
const storeForKind = (kind: ValueKind): SecretStore =>
  kind === 'secret' ? 'secrets-manager' : 'ssm';

// Single source of truth for the store prefixes: `@aws-amplify/hosting`'s
// `store-paths` (the CDK-free module `defineHosting` also uses at synth). The
// CLI (which writes the value) and the hosting construct (which wires the read)
// therefore compute the identical `/amplify/hosting/<project>/{secrets,config}`
// path from one implementation — no duplicated sanitization to drift.
const prefixForKind = (kind: ValueKind, projectDir: string): string => {
  const { secretPrefix, configPrefix } = getHostingStorePrefixes(projectDir);
  return kind === 'secret' ? secretPrefix : configPrefix;
};

/**
 * Reads/writes self-managed hosting values in their backing store — AWS Secrets
 * Manager for `secret`, SSM Parameter Store for `config`. The store path is
 * derived from the marker kind + the per-project prefix via the same
 * `secretStoreLocator` that `@aws-blocks/hosting` uses at synth and runtime, so
 * a value the CLI sets is exactly where `getSecret`/`getConfig` reads it.
 */
export class HostingValueStore {
  private readonly prefix: string;
  private readonly secretsClient: SecretsManagerClient;
  private readonly ssmClient: SSMClient;

  /**
   * Create a store for a single value kind.
   */
  constructor(
    private readonly kind: ValueKind,
    projectDir: string = process.cwd(),
    clients: { secrets?: SecretsManagerClient; ssm?: SSMClient } = {},
  ) {
    this.prefix = prefixForKind(kind, projectDir);
    this.secretsClient = clients.secrets ?? new SecretsManagerClient();
    this.ssmClient = clients.ssm ?? new SSMClient();
  }

  /** The store-appropriate locator for a key (SM name or SSM path). */
  locator = (key: string): string =>
    secretStoreLocator(key, {
      prefix: this.prefix,
      store: storeForKind(this.kind),
    });

  /** Set (create or overwrite) a value. */
  setValue = async (key: string, value: string): Promise<void> => {
    const name = this.locator(key);
    if (this.kind === 'secret') {
      try {
        await this.secretsClient.send(
          new PutSecretValueCommand({ SecretId: name, SecretString: value }),
        );
      } catch (e) {
        if (e instanceof ResourceNotFoundException) {
          await this.secretsClient.send(
            new CreateSecretCommand({ Name: name, SecretString: value }),
          );
        } else {
          throw e;
        }
      }
    } else {
      await this.ssmClient.send(
        new PutParameterCommand({
          Name: name,
          Value: value,
          Type: 'String',
          Overwrite: true,
        }),
      );
    }
  };

  /** Get a value, or `undefined` if it doesn't exist. */
  getValue = async (key: string): Promise<string | undefined> => {
    const name = this.locator(key);
    try {
      if (this.kind === 'secret') {
        const res = await this.secretsClient.send(
          new GetSecretValueCommand({ SecretId: name }),
        );
        return res.SecretString;
      }
      const res = await this.ssmClient.send(
        new GetParameterCommand({ Name: name, WithDecryption: true }),
      );
      return res.Parameter?.Value;
    } catch (e) {
      if (
        e instanceof ResourceNotFoundException ||
        e instanceof ParameterNotFound
      ) {
        return undefined;
      }
      throw e;
    }
  };

  /** List the keys currently set under this project's prefix (names only). */
  listKeys = async (): Promise<string[]> => {
    // Match each store's leading-slash normalization: Secrets Manager names are
    // slash-free at the root; SSM paths keep the leading slash.
    const base =
      this.kind === 'secret' ? this.prefix.replace(/^\/+/, '') : this.prefix;
    const keys: string[] = [];
    if (this.kind === 'secret') {
      let nextToken: string | undefined;
      do {
        const res = await this.secretsClient.send(
          new ListSecretsCommand({
            Filters: [{ Key: 'name', Values: [base] }],
            NextToken: nextToken,
          }),
        );
        for (const s of res.SecretList ?? []) {
          if (s.Name?.startsWith(`${base}/`))
            keys.push(s.Name.slice(base.length + 1));
        }
        nextToken = res.NextToken;
      } while (nextToken);
    } else {
      let nextToken: string | undefined;
      do {
        const res = await this.ssmClient.send(
          new GetParametersByPathCommand({
            Path: base,
            Recursive: true,
            NextToken: nextToken,
          }),
        );
        for (const p of res.Parameters ?? []) {
          if (p.Name?.startsWith(`${base}/`))
            keys.push(p.Name.slice(base.length + 1));
        }
        nextToken = res.NextToken;
      } while (nextToken);
    }
    return keys.sort();
  };

  /**
   * Remove a value. Secrets are *scheduled* for deletion with the default
   * Secrets Manager recovery window (30 days) — NOT force-deleted — so a
   * mistaken removal can be restored via the Secrets Manager RestoreSecret API.
   * (SSM parameters have no recovery window; deletion is always immediate.)
   */
  removeKey = async (key: string): Promise<void> => {
    const name = this.locator(key);
    if (this.kind === 'secret') {
      await this.secretsClient.send(
        new DeleteSecretCommand({ SecretId: name }),
      );
    } else {
      await this.ssmClient.send(new DeleteParameterCommand({ Name: name }));
    }
  };
}
