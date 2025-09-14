export interface ListModel {
  indexKey: string;
  [key: string]: any;
}

export interface ListModelConstructor {
  new (...args: any[]): ListModel;
  prototype: ListModel;
}

export type SimpleMapping = string;

export type ResolverFunction<T = any, R = any> = (rowData: T) => R;

export type CrossTableResolver<T = any> = (rowData: T) => {
  [key: string]: any;
  model?: ListModelConstructor;
};

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