import { DataObject, Filter, ListModel } from 'mobx-restful';
import { Constructor } from 'web-utility';

import { MigrationEventBus, MigrationSchema, ProgressTarget, TargetPatch } from './types';
import { ConsoleLogger } from './ConsoleLog';

export class RestMigrator<Source extends object, Target extends DataObject> {
  constructor(
    private dataSource: () => AsyncGenerator<Source>,
    private targetModel: Constructor<ListModel<Target>>,
    private fieldMapping: MigrationSchema<Source, Target>,
    private eventBus: MigrationEventBus<Source, Target> = new ConsoleLogger<Source, Target>()
  ) {}

  /**
   * Main migration method that yields progress information
   */
  async *boot() {
    const targetStore = new this.targetModel();
    let index = 0;

    for await (const sourceItem of this.dataSource()) {
      let mappedData: Partial<Target> | undefined;

      try {
        const fieldParts = this.mapFields(sourceItem, ++index);

        mappedData = Object.fromEntries(await Array.fromAsync(fieldParts)) as Partial<Target>;

        const targetItem = await targetStore.updateOne(mappedData);
        yield targetItem;

        await this.eventBus.save({ index, sourceItem, mappedData, targetItem });
      } catch (error: any) {
        const isSkip = error instanceof RangeError;

        await (isSkip ? this.eventBus.skip : this.eventBus.error)({
          index,
          sourceItem,
          mappedData,
          error,
        });
      }
    }
  }

  /**
   * Maps source data fields to target model fields according to the configuration
   */
  private async *mapFields(sourceItem: Source, index: number) {
    for (const sourceField in this.fieldMapping) {
      const mapping = this.fieldMapping[sourceField],
        value = sourceItem[sourceField];

      const resolvedMapping =
        typeof mapping === 'function'
          ? await mapping(sourceItem)
          : typeof mapping === 'string'
          ? { [mapping]: { value } }
          : mapping!;

      yield* this.applyObjectMapping(
        value,
        resolvedMapping as TargetPatch<Target>,
        (mappedData, targetItem) =>
          this.eventBus.save({ index, sourceItem, mappedData, targetItem }),
        (mappedData, error) => this.eventBus.error({ index, sourceItem, mappedData, error })
      );
    }
  }

  private async *applyObjectMapping(
    sourceValue: Source[keyof Source],
    mapping: TargetPatch<Target>,
    onRelationSave: (
      mappedData: Partial<ProgressTarget<Target>>,
      targetItem: ProgressTarget<Target>
    ) => any,
    onRelationError: (mappedData: Partial<ProgressTarget<Target>>, error: Error) => any
  ) {
    const targetStore = new this.targetModel();

    for (const key in mapping) {
      let { value, unique, model } = mapping[key]!;

      value ??= sourceValue as unknown as Target[keyof Target];

      if (!(value != null)) continue;

      if (unique) {
        const [existed] = await targetStore.getList({ [key]: value } as Filter<Target>, 1, 1);

        if (existed) throw new RangeError(`Duplicate value for unique field '${key}': ${value}`);
      } else if (model)
        try {
          const relatedStore = new model();

          const savedValue = await relatedStore.updateOne(value);

          onRelationSave(value, savedValue);

          value = savedValue[relatedStore.indexKey];
        } catch (error) {
          onRelationError(value as Partial<ProgressTarget<Target>>, error as Error);
          continue;
        }
      yield [key, value!] as const;
    }
  }
}
