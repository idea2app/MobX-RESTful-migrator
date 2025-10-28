import { DataObject, ListModel } from 'mobx-restful';
import { Constructor, TypeKeys } from 'web-utility';

export type TargetPatch<T extends object> = {
  [K in keyof T]?: {
    value?: Partial<T[K]>;
    unique?: boolean;
    model?: Constructor<ListModel<T[K] extends DataObject ? T[K] : never>>;
  };
};

export type FieldMapping<Source extends object = object, Target extends object = object> =
  | keyof Target
  | TargetPatch<Target>
  | ((rawRow: Source) => TargetPatch<Target> | Promise<TargetPatch<Target>>);

export type MigrationSchema<Source extends object = object, Target extends object = object> = {
  [sourceField in keyof Source]?: FieldMapping<Source, Target>;
};

export type ProgressTarget<Target extends object> = Target | Target[TypeKeys<Target, object>];

export interface MigrationProgress<Source extends object, Target extends object> {
  index: number;
  sourceItem?: Source;
  mappedData?: Partial<ProgressTarget<Target>>;
  targetItem?: ProgressTarget<Target>;
  error?: Error;
}

export type MigrationEventBus<Source extends object, Target extends object> = Record<
  'save' | 'skip' | 'error',
  (progress: MigrationProgress<Source, Target>) => Promise<void>
>;

export interface BootOption<SourceOption extends object | undefined = {}> {
  dryRun?: boolean;
  sourceOption?: SourceOption;
}
