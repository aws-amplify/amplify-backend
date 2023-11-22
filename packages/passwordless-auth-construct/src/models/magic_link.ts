const base64Encoding: BufferEncoding = 'base64url';
const separator = '.';
const codePlaceholder = '##code##';

/**
 * A class representing the data use in a magic link.
 */
export class MagicLink {
  /**
   * Creates a new magic link.
   * @param userPoolId - The User Pool ID the link should be created for.
   * @param username - The username of the user requesting the link.
   * @param iat - The date the link was issued.
   * @param exp - The date the link expires.
   */
  protected constructor(
    public readonly userPoolId: string,
    public readonly username: string,
    public readonly iat: number,
    public readonly exp: number
  ) {}

  /**
   * Creates a new MagicLink with the ait set to the current time.
   * @param userPoolId - The user pool that this link is created for.
   * @param username - The username of the user that this link was created for.
   * @param secondsUntilExpiry - The number of seconds the link should be valid for.
   * @returns A new MagicLink.
   */
  static create = (
    userPoolId: string,
    username: string,
    secondsUntilExpiry: number
  ): MagicLink => {
    const now = Date.now();
    const exp = Math.floor(now / 1000 + secondsUntilExpiry);
    const iat = Math.floor(now / 1000);
    return new MagicLink(userPoolId, username, iat, exp);
  };

  /**
   * Creates a SignedMagicLink from the current MagicLink and a signature.
   * @param signature - The signature that was generated from this magic link.
   * @returns a SignedMagicLink.
   */
  public withSignature = (
    signature: Uint8Array,
    keyId: string
  ): SignedMagicLink => {
    return SignedMagicLink.fromMagicLink(this, signature, keyId);
  };

  /**
   * The data associated with this magic link, which is used when generating
   * the magic link redirect URI.
   *
   * The userPoolId is excluded as it should only be included when generating
   * the signature.
   */
  get data(): Buffer {
    const { username, iat, exp } = this;
    return Buffer.from(
      JSON.stringify({
        username,
        iat,
        exp,
      })
    );
  }
  /**
   * The data associated with this magic link that should be used when generating
   * the signature.
   *
   * The userPoolId is included to prevent a magic link created with one
   * userPool from being used with another userPool.
   */
  get signatureData(): Buffer {
    const { userPoolId } = this;
    return Buffer.concat([
      this.data,
      Buffer.from(JSON.stringify({ userPoolId })),
    ]);
  }

  /**
   * Whether or not this link is expired based on the exp.
   */
  get isExpired(): boolean {
    return this.exp < Date.now() / 1000;
  }
}

/**
 * A MagicLink with an attached signature.
 */
export class SignedMagicLink extends MagicLink {
  /**
   * Creates a new signed magic link.
   * @param userPoolId - The User Pool ID the link should be created for.
   * @param username - The username of the user requesting the link.
   * @param iat - The date the link was issued.
   * @param exp - The date the link expires.
   * @param signature - The signature associated with this link.
   * @param keyId - The ID of the key that was used to sign the link.
   */
  protected constructor(
    userPoolId: string,
    username: string,
    iat: number,
    exp: number,
    public readonly signature: Uint8Array,
    public readonly keyId?: string
  ) {
    super(userPoolId, username, iat, exp);
  }

  /**
   * Creates a SignedMagicLink from the MagicLink and signature.
   * @param magicLink - The Magic Link that has been signed.
   * @param signature - The signature that was generated from this magic link.
   * @returns a SignedMagicLink.
   */
  static fromMagicLink = (
    magicLink: MagicLink,
    signature: Uint8Array,
    keyId: string
  ): SignedMagicLink => {
    const { username, userPoolId, iat, exp } = magicLink;
    return new SignedMagicLink(
      userPoolId,
      username,
      iat,
      exp,
      signature,
      keyId
    );
  };

  /**
   * Creates a SignedMagicLink from a link fragment that was provided by a client.
   * @param linkFragment - The portion of the Magic Link redirectURI that includes the magic link data.
   * @param userPoolId - The current UserPoolId
   * @returns a SignedMagicLink.
   */
  static fromLinkFragment = (
    linkFragment: string,
    userPoolId: string
  ): SignedMagicLink => {
    const [base64Data, base64Signature] = linkFragment.split(separator);
    const signature = Buffer.from(base64Signature, base64Encoding);
    const message = Buffer.from(base64Data, base64Encoding);
    const data = JSON.parse(message.toString());
    const { username, iat, exp } = data;
    return new SignedMagicLink(userPoolId, username, iat, exp, signature);
  };

  /**
   * Returns the base64 encoded magic link without the full URI in the format
   * <data>.<signature>
   */
  get linkFragment(): string {
    const { data } = this;
    const dataB64String = Buffer.from(data).toString(base64Encoding);
    const signatureB64String = Buffer.from(this.signature).toString(
      base64Encoding
    );
    return `${dataB64String}${separator}${signatureB64String}`;
  }

  /**
   * Creates the full redirect URI from the provided template.
   * @param redirectUriTemplate - A template to insert the magic link data into, ex: https:example.com/##code##
   * @returns The full redirect URI that will be sent to the end user.
   */
  public generateRedirectUri = (redirectUriTemplate: string): string => {
    return redirectUriTemplate.replace(codePlaceholder, this.linkFragment);
  };
}
