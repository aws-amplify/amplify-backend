/**
 * Creates a partial ordering of record entries
 * The beginning entries are ordered based on keyStartOrder.
 * The ending entries are ordered based on keyEndOrder.
 * All other entries in the record are arbitrarily ordered between the start and end keys
 */
export class RecordEntryPartialKeyOrdering<T>
  implements RecordEntryOrdering<T>
{
  /**
   * Construct an instance with a record and a starting and ending key order
   */
  constructor(
    private readonly record: Record<string, T>,
    private readonly keyStartOrder: string[],
    private readonly keyEndOrder: string[]
  ) {}

  /**
   * Compute and return the entries ordered by the configured keys.
   * The original record is unmodified but values from the original record are referenced in the return array
   */
  getOrderedEntries() {
    const result: [string, T][] = [];
    // add all the entries in the beginningKeys array
    this.keyStartOrder
      .filter((startKey) => startKey in this.record)
      .forEach((startKey) => result.push([startKey, this.record[startKey]]));

    // then add all the entries that are not in either array
    const mergedKeys = this.keyStartOrder.concat(this.keyEndOrder);
    Object.entries(this.record)
      .filter(([key]) => !mergedKeys.includes(key))
      .forEach((entry) => result.push(entry));

    // then add all the entries in the endingKeys array
    this.keyEndOrder
      .filter((endKey) => endKey in this.record)
      .forEach((endKey) => result.push([endKey, this.record[endKey]]));
    return result;
  }
}

type RecordEntryOrdering<T> = {
  getOrderedEntries(): [string, T][];
};
