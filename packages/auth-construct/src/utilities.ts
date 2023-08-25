import { aws_cognito } from 'aws-cdk-lib';
enum CustomAttributeTypes {
  STRING = 'String',
  NUMBER = 'Number',
  DATETIME = 'DateTime',
  BOOLEAN = 'Boolean',
}
export const CUSTOM_ATTRIBUTE = {
  string: (
    name: string,
    options?: {
      mutable?: boolean;
      minLength?: number;
      maxLength?: number;
    }
  ) => {
    return {
      [name]: <aws_cognito.StringAttribute>{
        bind: () => {
          return {
            dataType: CustomAttributeTypes.STRING,
            stringConstraints: {
              minLen: options?.minLength,
              maxLen: options?.maxLength,
            },
            mutable: options?.mutable,
          };
        },
      },
    };
  },
  number: (
    name: string,
    options?: {
      mutable?: boolean;
      min?: number;
      max?: number;
    }
  ) => {
    return {
      [name]: <aws_cognito.NumberAttribute>{
        bind: () => {
          return {
            dataType: CustomAttributeTypes.NUMBER,
            numberConstraints: {
              min: options?.min,
              max: options?.max,
            },
            mutable: options?.mutable,
          };
        },
      },
    };
  },
  boolean: (
    name: string,
    options?: {
      mutable?: boolean;
    }
  ) => {
    return {
      [name]: <aws_cognito.BooleanAttribute>{
        bind: () => {
          return {
            dataType: CustomAttributeTypes.BOOLEAN,
            mutable: options?.mutable,
          };
        },
      },
    };
  },
  dateTime: (
    name: string,
    options?: {
      mutable?: boolean;
    }
  ) => {
    return {
      [name]: <aws_cognito.DateTimeAttribute>{
        bind: () => {
          return {
            dataType: CustomAttributeTypes.DATETIME,
            mutable: options?.mutable,
          };
        },
      },
    };
  },
};
