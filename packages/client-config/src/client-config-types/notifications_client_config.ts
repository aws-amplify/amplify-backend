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
    APNS?: {
      AWSPinpoint: {
        appId: string;
        region: string;
      };
    };
    FCM?: {
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
