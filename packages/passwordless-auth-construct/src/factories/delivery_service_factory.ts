import { DeliveryMedium, DeliveryService } from '../types.js';

/**
 * Factory for creating delivery services.
 * Determines which delivery service to use based on the deliveryMedium.
 */
export class DeliveryServiceFactory {
  /**
   * Creates a new DeliveryServiceFactory instance.
   * @param services - The list of supported delivery services.
   */
  constructor(private services?: DeliveryService[]) {}

  public getService = (deliveryMedium: DeliveryMedium) => {
    for (const service of this.services ?? []) {
      if (service.deliveryMedium === deliveryMedium) {
        return service;
      }
    }
    throw new Error(`No DeliveryService found for: ${deliveryMedium}`);
  };
}
