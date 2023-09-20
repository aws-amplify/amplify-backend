import { aws_cognito } from 'aws-cdk-lib';
import {
  CustomAttributeConfig,
  StandardAttributes,
} from 'aws-cdk-lib/aws-cognito';
/**
 * Examples:
 * AuthAttributeFactory('address').immutable().required();
 * AuthCustomAttributeFactory.string('color').minLength(10).maxLength(100);
 */

/**
 * Represents a standard or custom user attribute.
 */
export type AuthUserAttribute = AuthStandardAttribute | AuthCustomAttributeBase;
/**
 * Type used to make readonly properties of T mutable.
 */
export type Mutable<T> = {
  -readonly [P in keyof T]: Mutable<T[P]>;
};
/**
 * This class facilitates creation of Standard user attributes.
 */
export class AuthStandardAttribute {
  private isMutable = true;
  private isRequired = false;
  /**
   * Create a Standard Attribute.
   * @param name - The attribute name, must be one of StandardAttributes
   */
  constructor(private name: keyof StandardAttributes) {
    this.name = name;
  }
  /**
   * Makes this attribute immutable.
   * @returns the attribute
   */
  immutable = (): AuthStandardAttribute => {
    this.isMutable = false;
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
  /**
   * This method is effectively package private, we use it to get the attribute configuration
   * without exposing this method to users.
   * @returns Partial\<aws_cognito.StandardAttributes\>
   */
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
/**
 * This class facilitates creation of Custom user attributes.
 */
export class AuthCustomAttributeBase {
  protected attribute: Mutable<CustomAttributeConfig>;
  /**
   * Create a Custom Attribute
   * @param name - A name for the custom attribute
   */
  constructor(private readonly name: string) {
    this.name = name;
    this.attribute = {
      dataType: '',
      mutable: true,
    };
  }
  /**
   * Makes this attribute immutable.
   * @returns the attribute
   */
  immutable = () => {
    this.attribute.mutable = false;
    return this;
  };
  /**
   * This method is effectively package private, we use it to get the attribute configuration
   * without exposing this method to users.
   * @returns aws_cognito.ICustomAttribute
   */
  private _toCustomAttributes = (): Record<
    string,
    aws_cognito.ICustomAttribute
  > => {
    return {
      [this.name]: {
        bind: () => {
          return this.attribute;
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
    this.attribute = {
      dataType: 'String',
      mutable: true,
      stringConstraints: {},
    };
  }
  /**
   * Set the minimum length for this attribute
   * @returns the attribute
   */
  minLength = (minLength: number): AuthCustomStringAttribute => {
    this.attribute.stringConstraints = {
      ...this.attribute.stringConstraints,
      minLen: minLength,
    };
    return this;
  };
  /**
   * Set the maximum length for this attribute
   * @returns the attribute
   */
  maxLength = (maxLength: number): AuthCustomStringAttribute => {
    this.attribute.stringConstraints = {
      ...this.attribute.stringConstraints,
      maxLen: maxLength,
    };
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
    this.attribute = {
      dataType: 'Number',
      mutable: true,
      numberConstraints: {},
    };
  }
  /**
   * Set the minimum value for this attribute
   * @returns the attribute
   */
  min = (min: number): AuthCustomNumberAttribute => {
    this.attribute.numberConstraints = {
      ...this.attribute.numberConstraints,
      min,
    };
    return this;
  };
  /**
   * Set the maximum value for this attribute
   * @returns the attribute
   */
  max = (max: number): AuthCustomNumberAttribute => {
    this.attribute.numberConstraints = {
      ...this.attribute.numberConstraints,
      max,
    };
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
    this.attribute = {
      dataType: 'DateTime',
      mutable: true,
    };
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
    this.attribute = {
      dataType: 'Boolean',
      mutable: true,
    };
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
  string = (name: string) => {
    return new AuthCustomStringAttribute(name);
  };
  /**
   * Create a custom attribute of 'Number' dataType
   * @param name - the name for this attribute
   */
  number = (name: string) => {
    return new AuthCustomNumberAttribute(name);
  };
  /**
   * Create a custom attribute of 'Boolean' dataType
   * @param name - the name for this attribute
   */
  boolean = (name: string) => {
    return new AuthCustomBooleanAttribute(name);
  };
  /**
   * Create a custom attribute of 'Boolean' dataType
   * @param name - the name for this attribute
   */
  dateTime = (name: string) => {
    return new AuthCustomDateTimeAttribute(name);
  };
}
