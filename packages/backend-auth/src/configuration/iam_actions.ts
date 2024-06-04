import { AuthAction } from '../types.js';

type IamActionMap = {
  [action in AuthAction]: string[];
};

export const iamActionMap: IamActionMap = {
  manageUsers: [
    'cognito-idp:AdminConfirmSignUp',
    'cognito-idp:AdminCreateUser',
    'cognito-idp:AdminDeleteUser',
    'cognito-idp:AdminDeleteUserAttributes',
    'cognito-idp:AdminDisableUser',
    'cognito-idp:AdminEnableUser',
    'cognito-idp:AdminGetUser',
    'cognito-idp:AdminListGroupsForUser',
    'cognito-idp:AdminRespondToAuthChallenge',
    'cognito-idp:AdminSetUserMFAPreference',
    'cognito-idp:AdminSetUserSettings',
    'cognito-idp:AdminUpdateUserAttributes',
    'cognito-idp:AdminUserGlobalSignOut',
  ],
  manageGroupMembership: [
    'cognito-idp:AdminAddUserToGroup',
    'cognito-idp:AdminRemoveUserFromGroup',
  ],
  manageGroups: [
    'cognito-idp:GetGroup',
    'cognito-idp:ListGroups',
    'cognito-idp:CreateGroup',
    'cognito-idp:DeleteGroup',
    'cognito-idp:UpdateGroup',
  ],
  manageUserDevices: [
    'cognito-idp:AdminForgetDevice',
    'cognito-idp:AdminGetDevice',
    'cognito-idp:AdminListDevices',
    'cognito-idp:AdminUpdateDeviceStatus',
  ],
  managePasswordRecovery: [
    'cognito-idp:AdminResetUserPassword',
    'cognito-idp:AdminSetUserPassword',
  ],
  addUserToGroup: ['cognito-idp:AdminAddUserToGroup'],
  createUser: ['cognito-idp:AdminCreateUser'],
  deleteUser: ['cognito-idp:AdminDeleteUser'],
  deleteUserAttributes: ['cognito-idp:AdminDeleteUserAttributes'],
  disableUser: ['cognito-idp:AdminDisableUser'],
  enableUser: ['cognito-idp:AdminEnableUser'],
  forgetDevice: ['cognito-idp:AdminForgetDevice'],
  getDevice: ['cognito-idp:AdminGetDevice'],
  getUser: ['cognito-idp:AdminGetUser'],
  listDevices: ['cognito-idp:AdminListDevices'],
  listGroupsForUser: ['cognito-idp:AdminListGroupsForUser'],
  removeUserFromGroup: ['cognito-idp:AdminRemoveUserFromGroup'],
  resetUserPassword: ['cognito-idp:AdminResetUserPassword'],
  setUserMfaPreference: ['cognito-idp:AdminSetUserMFAPreference'],
  setUserPassword: ['cognito-idp:AdminSetUserPassword'],
  setUserSettings: ['cognito-idp:AdminSetUserSettings'],
  updateDeviceStatus: ['cognito-idp:AdminUpdateDeviceStatus'],
  updateUserAttributes: ['cognito-idp:AdminUpdateUserAttributes'],
};
