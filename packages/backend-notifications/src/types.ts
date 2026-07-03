/**
 * Properties accepted by {@link defineNotifications}.
 */
export type NotificationsFactoryProps = {
  /**
   * Name of the EXISTING Amazon Connect Customer Profiles domain to attach to —
   * e.g. the domain Amazon Connect auto-creates (`amazon-connect-<instance>`)
   * when Customer Profiles is enabled on your instance.
   *
   * The AmplifyProfile / AmplifyDevice object types are registered INTO this
   * domain additively; the domain itself is never created or modified. Required:
   * a Connect instance owns its Customer Profiles domain 1:1, so this resource
   * always attaches to that domain rather than provisioning its own.
   */
  domainName: string;

  /**
   * Profile / object-type expiration in days.
   * @default 366
   */
  expirationDays?: number;
};
