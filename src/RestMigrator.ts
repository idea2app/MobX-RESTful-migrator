import 'core-js/es/array/from-async';
import { DataObject, Filter, ListModel } from 'mobx-restful';
import { Constructor } from 'web-utility';

import { MigrationConfig, TargetPatch } from './types';

export class RestMigrator<Source extends object, Target extends DataObject> {
  constructor(
    private dataSource: () => AsyncGenerator<Source>,
    private targetModel: Constructor<ListModel<Target>>,
    private fieldMapping: MigrationConfig<Source, Target>
  ) {}

  /**
   * Main migration method that yields progress information
   */
  async *boot() {
    const targetStore = new this.targetModel();

    for await (const sourceItem of this.dataSource()) {
      const mappedData = Object.fromEntries(await Array.fromAsync(this.mapFields(sourceItem)));

      yield targetStore.updateOne(mappedData as Target);
    }
  }

  /**
   * Maps source data fields to target model fields according to the configuration
   */
  private async *mapFields(sourceData: Source) {
    for (const sourceField in this.fieldMapping) {
      const mapping = this.fieldMapping[sourceField],
        value = sourceData[sourceField];

      const resolvedMapping =
        typeof mapping === 'function'
          ? await mapping(sourceData)
          : typeof mapping === 'string'
          ? { [mapping]: { value } }
          : mapping!;

      yield* this.applyObjectMapping(value, resolvedMapping as TargetPatch<Target>);
    }
  }

  private async *applyObjectMapping(
    sourceValue: Source[keyof Source],
    mapping: TargetPatch<Target>
  ) {
    const targetStore = new this.targetModel();

    for (const key in mapping) {
      let { value, unique, model } = mapping[key]!;

      value ??= sourceValue as unknown as Target[keyof Target];

      if (!(value != null)) continue;

      if (unique) {
        const [existed] = await targetStore.getList({ [key]: value } as Filter<Target>, 1, 1);

        if (existed) throw new RangeError(`Duplicate value for unique field '${key}': ${value}`);
      } else if (model) {
        const relatedStore = new model();

        ({ [relatedStore.indexKey]: value } = await relatedStore.updateOne(value));
      }
      yield [key, value!] as const;
    }
  }
}
