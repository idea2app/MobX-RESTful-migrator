import { DataObject } from 'mobx-restful';

import { MigrationEventBus, MigrationProgress } from './types';

export class ConsoleLogger<Source extends object, Target extends DataObject>
  implements MigrationEventBus<Source, Target>
{
  async save({ index, sourceItem, mappedData, targetItem }: MigrationProgress<Source, Target>) {
    console.info(`saved No.${index}`);
    console.info('[source]');
    console.table(sourceItem);
    console.info('[mapped]');
    console.table(mappedData);
    console.info('[target]');
    console.table(targetItem);
  }

  async skip({ index, sourceItem, mappedData, error }: MigrationProgress<Source, Target>) {
    console.warn(`skipped No.${index}`);
    console.warn(`[reason]`);
    console.warn(error);
    console.info('[source]');
    console.table(sourceItem);
    console.info('[mapped]');
    console.table(mappedData);
  }

  async error({ index, sourceItem, mappedData, error }: MigrationProgress<Source, Target>) {
    console.error(`error at No.${index}`);
    console.error(`[error]`);
    console.error(error);
    console.info('[source]');
    console.table(sourceItem);
    console.info('[mapped]');
    console.table(mappedData);
  }
}
