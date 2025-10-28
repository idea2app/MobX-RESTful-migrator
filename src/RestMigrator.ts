import { DataObject, Filter, ListModel } from 'mobx-restful';
import { Constructor, isEmpty } from 'web-utility';

import { ConsoleLogger } from './ConsoleLog';
import {
  BootOption,
  MigrationEventBus,
  MigrationProgress,
  MigrationSchema,
  ProgressTarget,
  TargetPatch,
} from './types';

export class RestMigrator<
  Source extends object,
  Target extends DataObject,
  SourceOption extends object | undefined = {},
> {
  dryRun = false;

  constructor(
    private dataSource: (option?: SourceOption) => Iterable<Source> | AsyncIterable<Source>,
    private TargetModel: Constructor<ListModel<Target>>,
    private fieldMapping: MigrationSchema<Source, Target>,
    private eventBus: MigrationEventBus<Source, Target> = new ConsoleLogger<Source, Target>(),
  ) {}

  /**
   * Main migration method that yields progress information
   */
  async *boot({ dryRun = this.dryRun, sourceOption }: BootOption<SourceOption> = {}) {
    this.dryRun = dryRun;

    const targetStore = new this.TargetModel();
    let index = 0;

    for await (const sourceItem of this.dataSource(sourceOption)) {
      let mappedData: Partial<Target> | undefined;

      try {
        const fieldParts = this.mapFields(sourceItem, ++index);

        mappedData = Object.fromEntries(await Array.fromAsync(fieldParts)) as Partial<Target>;

        const targetItem = dryRun
          ? (mappedData as Awaited<ReturnType<typeof targetStore.updateOne>>)
          : await targetStore.updateOne(mappedData);

        yield targetItem;

        await this.eventBus.save({ index, sourceItem, mappedData, targetItem });
      } catch (error: unknown) {
        await this.handleError({ index, sourceItem, mappedData, error: error as Error });
      }
    }
  }

  private async handleError({ error, ...progress }: MigrationProgress<Source, Target>) {
    const isSkip = error instanceof RangeError;

    await (isSkip ? this.eventBus.skip : this.eventBus.error)({
      ...progress,
      error: error as Error,
    });
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
        (mappedData, error) => this.handleError({ index, sourceItem, mappedData, error }),
      );
    }
  }

  private async *applyObjectMapping(
    sourceValue: Source[keyof Source],
    mapping: TargetPatch<Target>,
    onRelationSave: (
      mappedData: Partial<ProgressTarget<Target>>,
      targetItem: ProgressTarget<Target>,
    ) => any | Promise<any>,
    onRelationError: (
      mappedData: Partial<ProgressTarget<Target>>,
      error: Error,
    ) => any | Promise<any>,
  ) {
    const { TargetModel, dryRun } = this;

    const targetStore = new TargetModel();

    for (const key in mapping) {
      let { value, unique, model } = mapping[key]!;

      value ??= sourceValue as unknown as Target[keyof Target];

      if (!(value != null)) continue;

      if (unique) {
        const [existed] = await targetStore.getList({ [key]: value } as Filter<Target>, 1, 1);

        if (existed) throw new RangeError(`Duplicate value for unique field '${key}': ${value}`);
      } else if (isEmpty(value)) {
        continue;
      } else if (model)
        try {
          const relatedStore = new model();

          const savedValue = dryRun
            ? (value as Awaited<ReturnType<typeof relatedStore.updateOne>>)
            : await relatedStore.updateOne(value);

          await onRelationSave(value, savedValue);

          value = savedValue[relatedStore.indexKey];
        } catch (error) {
          await onRelationError(value as Partial<ProgressTarget<Target>>, error as Error);
          continue;
        }
      yield [key, value!] as const;
    }
  }
}
