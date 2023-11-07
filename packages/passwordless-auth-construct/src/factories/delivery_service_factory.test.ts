import { describe, it } from 'node:test';
import { rejects, strictEqual } from 'node:assert';
import { DeliveryService } from '../types.js';
import { DeliveryServiceFactory } from './delivery_service_factory.js';

void describe('DeliveryServiceFactory', () => {
  void it('getClient returns the correct service', () => {
    const smsDeliveryService: DeliveryService = {
      deliveryMedium: 'SMS',
      send: async () => undefined,
      mask: () => '',
      createMessage: () => '',
    };
    const emailDeliveryService: DeliveryService = {
      deliveryMedium: 'EMAIL',
      send: async () => undefined,
      mask: () => '',
      createMessage: () => '',
    };

    const factory = new DeliveryServiceFactory([
      smsDeliveryService,
      emailDeliveryService,
    ]);

    strictEqual(factory.getService('SMS'), smsDeliveryService);
    strictEqual(factory.getService('EMAIL'), emailDeliveryService);
  });
  void it('getService throws an error if no service is found', async () => {
    const factory = new DeliveryServiceFactory([]);
    await rejects(
      async () => factory.getService('EMAIL'),
      Error('No DeliveryService found for: EMAIL')
    );
  });
});
