import { type StandardAttributes } from 'aws-cdk-lib/aws-cognito';

// refer: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
const coreAttributeNameMap: {
  standardAttributeName: keyof StandardAttributes;
  userpoolAttributeName: string;
}[] = [
  {
    standardAttributeName: 'address',
    userpoolAttributeName: 'address',
  },
  {
    standardAttributeName: 'birthdate',
    userpoolAttributeName: 'birthdate',
  },
  {
    standardAttributeName: 'email',
    userpoolAttributeName: 'email',
  },
  {
    standardAttributeName: 'familyName',
    userpoolAttributeName: 'family_name',
  },
  {
    standardAttributeName: 'gender',
    userpoolAttributeName: 'gender',
  },
  {
    standardAttributeName: 'givenName',
    userpoolAttributeName: 'given_name',
  },
  {
    standardAttributeName: 'locale',
    userpoolAttributeName: 'locale',
  },
  {
    standardAttributeName: 'middleName',
    userpoolAttributeName: 'middle_name',
  },
  {
    standardAttributeName: 'nickname',
    userpoolAttributeName: 'nickname',
  },
  {
    standardAttributeName: 'phoneNumber',
    userpoolAttributeName: 'phone_number',
  },
  {
    standardAttributeName: 'profilePicture',
    userpoolAttributeName: 'picture',
  },
  {
    standardAttributeName: 'preferredUsername',
    userpoolAttributeName: 'preferred_username',
  },
  {
    standardAttributeName: 'profilePage',
    userpoolAttributeName: 'profile',
  },
  {
    standardAttributeName: 'lastUpdateTime',
    userpoolAttributeName: 'updated_at',
  },
  {
    standardAttributeName: 'website',
    userpoolAttributeName: 'website',
  },
];

export { coreAttributeNameMap };
