import * as fs from 'fs';
import * as path from 'path';
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

/**
 * Derive the per-project store identifier for self-managed hosting values.
 *
 * ⚠️ MUST stay in sync with `resolveStoreIdentifier` /
 * `getHostingStorePrefixes` in `@aws-amplify/hosting`'s `store_paths.ts` — the
 * CLI (which writes the value) and `defineHosting` (which wires the read at
 * synth) both compute this independently, and they must produce the identical
 * path or the runtime `getSecret`/`getConfig` won't find what the CLI set. The
 * `hosting_value_store.test.ts` pins the expected locator to guard against drift.
 */
const resolveStoreIdentifier = (projectDir: string): string => {
  let name: string | undefined;
  try {
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectDir, 'package.json'), 'utf-8'),
    );
    name = typeof pkg?.name === 'string' ? pkg.name : undefined;
    // eslint-disable-next-line @aws-amplify/amplify-backend-rules/no-empty-catch
  } catch {
    // No/invalid package.json — fall back to the default identifier.
  }
  const sanitized = (name ?? '')
    .replace(/^@[^/]+\//, '')
    .replace(/[^a-zA-Z0-9-_]/g, '-')
    .replace(/^-+|-+$/g, '');
  return sanitized || 'app';
};

const prefixForKind = (kind: ValueKind, projectDir: string): string => {
  const id = resolveStoreIdentifier(projectDir);
  return kind === 'secret'
    ? `/amplify/hosting/${id}/secrets`
    : `/amplify/hosting/${id}/config`;
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
   * mistaken removal can be restored with `aws secretsmanager restore-secret`.
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
