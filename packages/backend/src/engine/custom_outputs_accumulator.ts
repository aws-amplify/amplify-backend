import {
  AppendableBackendOutputEntry,
  BackendOutputEntry,
  BackendOutputStorageStrategy,
} from '@aws-amplify/plugin-types';
import { ClientConfig } from '@aws-amplify/client-config';
import {
  CustomOutput,
  customOutputKey,
} from '@aws-amplify/backend-output-schemas';

/**
 * Accumulates custom outputs as they're added to the backend.
 */
export class CustomOutputsAccumulator {
  private _backendOutputEntry:
    | AppendableBackendOutputEntry<CustomOutput>
    | undefined;
  private _customOutputCount = 0;

  /**
   * Creates custom outputs accumulator.
   */
  constructor(
    private readonly outputStorageStrategy: BackendOutputStorageStrategy<BackendOutputEntry>
  ) {}

  /**
   * Gets or creates backend output entry.
   */
  private get backendOutputEntry(): AppendableBackendOutputEntry<CustomOutput> {
    if (!this._backendOutputEntry) {
      this._backendOutputEntry =
        this.outputStorageStrategy.addAppendableBackendOutputEntry<CustomOutput>(
          customOutputKey,
          {
            version: '1',
            payload: {},
          }
        );
    }
    return this._backendOutputEntry;
  }

  addOutput = (clientConfigPart: Partial<ClientConfig>) => {
    const key = `customOutput${this._customOutputCount++}`;
    const value = JSON.stringify(clientConfigPart);
    this.backendOutputEntry.addToPayload(key, value);
  };
}
