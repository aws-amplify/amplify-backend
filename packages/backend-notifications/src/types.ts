/**
 * Properties accepted by {@link defineNotifications}.
 *
 * All properties are optional: calling `defineNotifications()` with no arguments
 * is the zero-config default that creates a new Amazon Connect instance +
 * Customer Profiles domain from scratch and wires the notifications resources
 * into it.
 */
export type NotificationsFactoryProps = {
  /**
   * Name of an EXISTING Amazon Connect Customer Profiles domain to attach to —
   * e.g. the domain Amazon Connect auto-creates (`amazon-connect-<instance>`)
   * when Customer Profiles is enabled on your instance.
   *
   * OMIT this (the default) to CREATE FROM SCRATCH: the resource provisions a
   * brand-new Connect instance AND a brand-new Customer Profiles domain (with
   * generated, stable names) and registers the AmplifyProfile / AmplifyDevice
   * object types into that new domain — no pre-existing Connect setup required.
   *
   * When PROVIDED, the resource ATTACHES: it registers the object types INTO
   * this existing domain additively and never creates an instance or a domain.
   */
  domainName?: string;

  /**
   * CREATE mode only: override the auto-generated Amazon Connect instance alias.
   * Ignored when `domainName` is provided (attach mode). When omitted, a
   * deterministic-yet-unique alias is derived from the app so it is stable
   * across deploy/delete and unique per app.
   */
  instanceAlias?: string;

  /**
   * Profile / object-type expiration in days.
   * @default 366
   */
  expirationDays?: number;
};
