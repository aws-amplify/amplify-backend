export type GeoClientConfig = {
  geo?: {
    amazon_location_service: {
      region: string;
      maps?: {
        items: Record<
          string,
          {
            style: string;
          }
        >;
        default: string;
      };
      search_indices?: {
        items: Array<string>;
        default: string;
      };
      geofenceCollections?: {
        items: Array<string>;
        default: string;
      };
    };
  };
};
