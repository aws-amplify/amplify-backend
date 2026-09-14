export type NotificationsClientConfig = {
  Notifications?: {
    SMS?: {
      AWSPinpoint: {
        appId: string;
        region: string;
      };
    };
    EMAIL?: {
      AWSPinpoint: {
        appId: string;
        region: string;
      };
    };
    // APNS and FCM maps to Push
    // https://github.com/aws-amplify/amplify-cli/blob/1da5de70c57b15a76f02c92364af4889d1585229/packages/amplify-frontend-javascript/lib/frontend-config-creator.js#L587-L588
    Push?: {
      AWSPinpoint: {
        appId: string;
        region: string;
      };
    };
    InAppMessaging?: {
      AWSPinpoint: {
        appId: string;
        region: string;
      };
    };
  };
};
