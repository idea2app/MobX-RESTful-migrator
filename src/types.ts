import { DataObject, ListModel } from 'mobx-restful';
import { Constructor, TypeKeys } from 'web-utility';

export type TargetPatch<T extends object> = {
  [K in keyof T]?: {
    value?: Partial<T[K]>;
    // 如果是本表字段，可以检测其是否已有同值记录
    unique?: boolean;
    // 如果是外表字段，必须有对应的模型
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
  (progress: MigrationProgress<Source, Target>) => Promise<any>
>;
