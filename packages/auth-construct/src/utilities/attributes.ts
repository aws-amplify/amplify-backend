import { aws_cognito } from 'aws-cdk-lib';
import { StandardAttributes } from 'aws-cdk-lib/aws-cognito';
/**
 * Examples:
 * AuthAttributeFactory('address').mutable().required();
 * AuthCustomAttributeFactory.string('color').minLength(10).maxLength(100);
 */

/**
 * Represents a standard or custom user attribute.
 */
export type AuthUserAttribute = AuthStandardAttribute | AuthCustomAttributeBase;

/**
 * This class facilitates creation of Standard user attributes.
 */
export class AuthStandardAttribute {
  private name: keyof StandardAttributes;
  private isMutable = false;
  private isRequired = false;
  /**
   * Create a Standard Attribute.
   * @param name - The attribute name, must be one of StandardAttributes
   */
  constructor(name: keyof StandardAttributes) {
    this.name = name;
  }
  /**
   * Makes this attribute mutable.
   * @returns the attribute
   */
  mutable = (): AuthStandardAttribute => {
    this.isMutable = true;
    return this;
  };
  /**
   * Makes this attribute required.
   * @returns the attribute
   */
  required = (): AuthStandardAttribute => {
    this.isRequired = true;
    return this;
  };
  private _toStandardAttributes =
    (): Partial<aws_cognito.StandardAttributes> => {
      return {
        [this.name]: {
          mutable: this.isMutable,
          required: this.isRequired,
        },
      };
    };
}
export type AuthCustomAttributeType =
  | 'String'
  | 'Number'
  | 'DateTime'
  | 'Boolean';
/**
 * This class facilitates creation of Custom user attributes.
 */
export abstract class AuthCustomAttributeBase {
  private name: string;
  private isMutable = false;
  protected dataType: AuthCustomAttributeType;
  protected minLengthValue: number;
  protected maxLengthValue: number;
  protected minValue: number;
  protected maxValue: number;
  /**
   * Create a Custom Attribute
   * @param name - A name for the custom attribute
   */
  constructor(name: string) {
    this.name = name;
  }
  /**
   * Makes this attribute mutable.
   * @returns the attribute
   */
  mutable = () => {
    this.isMutable = true;
    return this;
  };
  private _toCustomAttributes = (): {
    [key: string]: aws_cognito.ICustomAttribute;
  } => {
    return {
      [this.name]: {
        bind: () => {
          return {
            dataType: this.dataType,
            mutable: this.isMutable,
            ...(this.dataType === 'String'
              ? {
                  stringConstraints: {
                    minLen: this.minLengthValue,
                    maxLen: this.maxLengthValue,
                  },
                }
              : {}),
            ...(this.dataType === 'Number'
              ? {
                  numberConstraints: { min: this.minValue, max: this.maxValue },
                }
              : {}),
          };
        },
      },
    };
  };
}
/**
 * This class facilitates creation of Custom user attributes of 'String' dataTypes.
 */
export class AuthCustomStringAttribute extends AuthCustomAttributeBase {
  /**
   * Create a custom attribute of 'String' dataType
   * @param name - the name for this attribute
   */
  constructor(name: string) {
    super(name);
    this.dataType = 'String';
  }
  /**
   * Set the minimum length for this attribute
   * @returns the attribute
   */
  minLength = (minLength: number): AuthCustomStringAttribute => {
    this.minLengthValue = minLength;
    return this;
  };
  /**
   * Set the maximum length for this attribute
   * @returns the attribute
   */
  maxLength = (maxLength: number): AuthCustomStringAttribute => {
    this.maxLengthValue = maxLength;
    return this;
  };
}
/**
 * This class facilitates creation of Custom user attributes of 'Number' dataTypes.
 */
export class AuthCustomNumberAttribute extends AuthCustomAttributeBase {
  /**
   * Create a custom attribute of 'Number' dataType
   * @param name - the name for this attribute
   */
  constructor(name: string) {
    super(name);
    this.dataType = 'Number';
  }
  /**
   * Set the minimum value for this attribute
   * @returns the attribute
   */
  min = (min: number): AuthCustomNumberAttribute => {
    this.minValue = min;
    return this;
  };
  /**
   * Set the maximum value for this attribute
   * @returns the attribute
   */
  max = (max: number): AuthCustomNumberAttribute => {
    this.maxValue = max;
    return this;
  };
}
/**
 * This class facilitates creation of Custom user attributes of 'DateTime' dataTypes.
 */
export class AuthCustomDateTimeAttribute extends AuthCustomAttributeBase {
  /**
   * Create a custom attribute of 'DateTime' dataType
   * @param name - the name for this attribute
   */
  constructor(name: string) {
    super(name);
    this.dataType = 'DateTime';
  }
}
/**
 * This class facilitates creation of Custom user attributes of 'Boolean' dataTypes.
 */
export class AuthCustomBooleanAttribute extends AuthCustomAttributeBase {
  /**
   * Create a custom attribute of 'Boolean' dataType
   * @param name - the name for this attribute
   */
  constructor(name: string) {
    super(name);
    this.dataType = 'Boolean';
  }
}
/**
 * This tool simplifies the creation of Standard User Attributes.
 */
export const AuthAttributeFactory = (
  name: keyof StandardAttributes
): AuthStandardAttribute => {
  return new AuthStandardAttribute(name);
};
/**
 * This tool simplifies the creation of Custom User Attributes.
 */
export class AuthCustomAttributeFactory {
  /**
   * Create a custom attribute of 'String' dataType
   * @param name - the name for this attribute
   */
  string(name: string) {
    return new AuthCustomStringAttribute(name);
  }
  /**
   * Create a custom attribute of 'Number' dataType
   * @param name - the name for this attribute
   */
  number(name: string) {
    return new AuthCustomNumberAttribute(name);
  }
  /**
   * Create a custom attribute of 'Boolean' dataType
   * @param name - the name for this attribute
   */
  boolean(name: string) {
    return new AuthCustomBooleanAttribute(name);
  }
  /**
   * Create a custom attribute of 'Boolean' dataType
   * @param name - the name for this attribute
   */
  dateTime(name: string) {
    return new AuthCustomDateTimeAttribute(name);
  }
}
