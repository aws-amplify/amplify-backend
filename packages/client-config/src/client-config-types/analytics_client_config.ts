export type AnalyticsClientConfig = {
  // legacy
  aws_mobile_analytics_app_id?: string;
  aws_mobile_analytics_app_region?: string;

  Analytics?: {
    Pinpoint: {
      appId: string;
      region: string;
    };
  };
};
