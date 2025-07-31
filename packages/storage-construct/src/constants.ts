/**
 * Token used in storage paths to represent the entity ID placeholder.
 * This token gets replaced with actual entity substitution patterns during processing.
 *
 * Used in owner-based access patterns where users can only access their own files.
 * The token is replaced with the user's Cognito identity ID at runtime.
 * @example
 * ```typescript
 * // Path pattern with entity token
 * const path = `private/${entityIdPathToken}/*`;
 * // Results in: 'private/{entity_id}/*'
 *
 * // After substitution becomes:
 * // 'private/${cognito-identity.amazonaws.com:sub}/*'
 * ```
 */
export const entityIdPathToken = '{entity_id}';

/**
 * The actual substitution pattern used in IAM policies for entity-based access.
 * This Cognito identity variable gets resolved to the user's unique identity ID
 * when the policy is evaluated by AWS.
 *
 * This pattern allows users to access only files under paths that contain
 * their specific Cognito identity ID, enabling secure owner-based access control.
 * @example
 * ```typescript
 * // IAM policy resource with entity substitution
 * const resource = `arn:aws:s3:::bucket/private/${entityIdSubstitution}/*`;
 * // Results in: 'arn:aws:s3:::bucket/private/${cognito-identity.amazonaws.com:sub}/*'
 *
 * // At runtime, AWS resolves this to something like:
 * // 'arn:aws:s3:::bucket/private/us-east-1:12345678-1234-1234-1234-123456789012/*'
 * ```
 */
export const entityIdSubstitution = '${cognito-identity.amazonaws.com:sub}';
