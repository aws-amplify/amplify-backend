import { aws_cognito } from 'aws-cdk-lib';
import { StandardAttributes } from 'aws-cdk-lib/aws-cognito';
/**
 * Examples:
 * AmplifyAttributeBuilder('address').mutable(true).required(false);
 * AmplifyCustomAttributeBuilder.string('color').minLength(10).maxLength(100);
 */

/**
 * Represents a standard or custom user attribute.
 */
export type AmplifyUserAttribute =
  | AmplifyStandardAttribute
  | AmplifyCustomAttributeBase;

/**
 * This class facilitates creation of Standard user attributes.
 */
export class AmplifyStandardAttribute {
  private name: keyof StandardAttributes;
  private isMutable = false;
  private isRequired = false;
  /**
   * Create a Standard Attribute.
   * @param name The attribute name, must be one of StandardAttributes
   */
  constructor(name: keyof StandardAttributes) {
    this.name = name;
  }
  /**
   * Makes this attribute mutable.
   * @returns the attribute
   */
  mutable = (): AmplifyStandardAttribute => {
    this.isMutable = true;
    return this;
  };
  /**
   * Makes this attribute required.
   * @returns the attribute
   */
  required = (): AmplifyStandardAttribute => {
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
export type CustomAttributeType = 'String' | 'Number' | 'DateTime' | 'Boolean';
/**
 * This class facilitates creation of Custom user attributes.
 */
export class AmplifyCustomAttributeBase {
  private name: string;
  private isMutable = false;
  protected dataType: CustomAttributeType;
  protected minLengthValue: number;
  protected maxLengthValue: number;
  protected minValue: number;
  protected maxValue: number;
  /**
   * Create a Custom Attribute
   * @param name A name for the custom attribute
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
export class AmplifyCustomStringAttribute extends AmplifyCustomAttributeBase {
  /**
   * Create a custom attribute of 'String' dataType
   * @param name the name for this attribute
   */
  constructor(name: string) {
    super(name);
    this.dataType = 'String';
  }
  /**
   * Set the minimum length for this attribute
   * @returns the attribute
   */
  minLength = (minLength: number): AmplifyCustomStringAttribute => {
    this.minLengthValue = minLength;
    return this;
  };
  /**
   * Set the maximum length for this attribute
   * @returns the attribute
   */
  maxLength = (maxLength: number): AmplifyCustomStringAttribute => {
    this.maxLengthValue = maxLength;
    return this;
  };
}
/**
 * This class facilitates creation of Custom user attributes of 'Number' dataTypes.
 */
export class AmplifyCustomNumberAttribute extends AmplifyCustomAttributeBase {
  /**
   * Create a custom attribute of 'Number' dataType
   * @param name the name for this attribute
   */
  constructor(name: string) {
    super(name);
    this.dataType = 'Number';
  }
  /**
   * Set the minimum value for this attribute
   * @returns the attribute
   */
  min = (min: number): AmplifyCustomNumberAttribute => {
    this.minValue = min;
    return this;
  };
  /**
   * Set the maximum value for this attribute
   * @returns the attribute
   */
  max = (max: number): AmplifyCustomNumberAttribute => {
    this.maxValue = max;
    return this;
  };
}
/**
 * This class facilitates creation of Custom user attributes of 'DateTime' dataTypes.
 */
export class AmplifyCustomDateTimeAttribute extends AmplifyCustomAttributeBase {
  /**
   * Create a custom attribute of 'DateTime' dataType
   * @param name the name for this attribute
   */
  constructor(name: string) {
    super(name);
    this.dataType = 'DateTime';
  }
}
/**
 * This class facilitates creation of Custom user attributes of 'Boolean' dataTypes.
 */
export class AmplifyCustomBooleanAttribute extends AmplifyCustomAttributeBase {
  /**
   * Create a custom attribute of 'Boolean' dataType
   * @param name the name for this attribute
   */
  constructor(name: string) {
    super(name);
    this.dataType = 'Boolean';
  }
}
/**
 * This builder allows you to create Standard User Attributes.
 */
export const AmplifyAttributeBuilder = (
  name: keyof StandardAttributes
): AmplifyStandardAttribute => {
  return new AmplifyStandardAttribute(name);
};
/**
 * This builder allows you to create Custom User Attributes.
 */
export const AmplifyCustomAttributeBuilder = {
  string: (name: string) => {
    return new AmplifyCustomStringAttribute(name);
  },
  number: (name: string) => {
    return new AmplifyCustomNumberAttribute(name);
  },
  boolean: (name: string) => {
    return new AmplifyCustomBooleanAttribute(name);
  },
  dateTime: (name: string) => {
    return new AmplifyCustomDateTimeAttribute(name);
  },
};
