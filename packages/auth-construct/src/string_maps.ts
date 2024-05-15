import { StandardAttributes } from 'aws-cdk-lib/aws-cognito';

// refer: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
const coreAttributeNameMap: Record<keyof StandardAttributes, string> = {
  address: 'address',
  birthdate: 'birthdate',
  email: 'email',
  familyName: 'family_name',
  gender: 'gender',
  givenName: 'given_name',
  locale: 'locale',
  middleName: 'middle_name',
  fullname: 'name',
  nickname: 'nickname',
  phoneNumber: 'phone_number',
  profilePicture: 'picture',
  preferredUsername: 'preferred_username',
  profilePage: 'profile',
  timezone: 'zoneinfo',
  lastUpdateTime: 'updated_at',
  website: 'website',
};

export { coreAttributeNameMap };
