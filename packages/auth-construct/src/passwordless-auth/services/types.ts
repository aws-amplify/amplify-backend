/**
 * The delivery service interface.
 */
export abstract class DeliveryService {
  /**
   * Send message via delivery service
   * @param message the message to send
   * @param destination the destination of the message
   * @param region region to send SNS from
   */
  public abstract send(
    message: string,
    destination: string,
    region: string
  ): Promise<void>;

  /**
   * Mask a destination
   * Example: +12345678901 => +*********8901
   * @param destination The destination to mask
   * @returns The masked destination,
   */
  public abstract mask(destination: string): string;
}
