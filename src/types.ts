import { ListModel } from 'mobx-restful';
import { Constructor } from 'web-utility';

export type ListModelClass = Constructor<ListModel<any, any>>;

export type TargetPatch = Record<string, any> & {
  model?: ListModelClass;
};

export type SimpleMapping = string;

export type ResolverFunction<T = any, R = any> = (rowData: T) => R;

export type CrossTableResolver<T = any> = (rowData: T) => TargetPatch;

export type FieldMapping<T = any> = 
  | SimpleMapping
  | ResolverFunction<T, Record<string, any>>
  | CrossTableResolver<T>;

export interface MigrationConfig<TSource = any> {
  [sourceField: string]: FieldMapping<TSource>;
}

export interface MigrationProgress {
  processed: number;
  total?: number;
  currentItem?: any;
  error?: Error;
}