/**
 * Properties accepted by {@link defineNotifications}.
 */
export type NotificationsFactoryProps = {
  /**
   * Customer Profiles domain name.
   *
   * In the default ATTACH mode, the name of the EXISTING domain (e.g. the one
   * Amazon Connect auto-creates for your instance) that the AmplifyProfile /
   * AmplifyDevice object types are registered into — required in that mode. In
   * create mode (`createDomain: true`) the name of the domain to provision.
   * @default DEFAULT_DOMAIN_NAME (create mode only)
   */
  domainName?: string;

  /**
   * Provision a NEW Customer Profiles domain (with Identity Resolution
   * auto-merge) instead of attaching to an existing one.
   *
   * Default `false` (ATTACH mode): register the object types into the existing
   * domain named by `domainName` without creating a domain and without touching
   * its other integrations (CTR, Outbound Campaigns) or Identity Resolution.
   * Use this against a Connect-managed domain. Set `true` for greenfield.
   * @default false
   */
  createDomain?: boolean;

  /**
   * Profile / object-type expiration in days.
   * @default 366
   */
  expirationDays?: number;

  /**
   * Key under `custom` in `amplify_outputs.json` where the endpoint / region
   * are surfaced to the client.
   * @default 'CustomerProfiles'
   */
  outputKey?: string;

  /**
   * Enable the push-delivery path: a Lambda that Amazon Connect invokes (via a
   * Journey Custom-action) to deliver mobile push through AWS End User
   * Messaging. Additive — the identify path is unchanged when omitted.
   * @default false
   */
  push?: boolean;

  /**
   * Reuse an existing AWS End User Messaging / Pinpoint application (project)
   * id for push `SendMessages`. When omitted (and `push` is enabled) a minimal
   * Pinpoint app is created for the PoC.
   */
  eumApplicationId?: string;
};
