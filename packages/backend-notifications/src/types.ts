/**
 * Properties accepted by {@link defineNotifications}.
 */
export type NotificationsFactoryProps = {
  /**
   * Customer Profiles domain name to create.
   * @default DEFAULT_DOMAIN_NAME
   */
  domainName?: string;

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
};
