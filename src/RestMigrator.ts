import { ListModel } from 'mobx-restful';
import {
  ListModelClass,
  MigrationConfig,
  MigrationProgress,
  TargetPatch
} from './types';

export class RestMigrator<TSource = any> {
  private dataSource: AsyncIterable<TSource>;
  private targetModel: ListModelClass;
  private fieldMapping: MigrationConfig<TSource>;

  constructor(
    dataSource: AsyncIterable<TSource>,
    targetModel: ListModelClass,
    fieldMapping: MigrationConfig<TSource>
  ) {
    this.dataSource = dataSource;
    this.targetModel = targetModel;
    this.fieldMapping = fieldMapping;
  }

  /**
   * Main migration method that yields progress information
   */
  async *boot(): AsyncGenerator<MigrationProgress, void, unknown> {
    for await (const sourceItem of this.dataSource) {
      const mappedData = await this.mapFields(sourceItem);
      
      // Create and save the target model instance
      const targetInstance = new this.targetModel();
      Object.assign(targetInstance, mappedData);
      
      yield {
        processed: 0, // Let users handle counting externally
        currentItem: sourceItem,
      };
    }
  }

  /**
   * Maps source data fields to target model fields according to the configuration
   */
  private async mapFields(sourceData: TSource): Promise<Record<string, any>> {
    const mappedData: Record<string, any> = {};

    for (const [sourceField, mapping] of Object.entries(this.fieldMapping)) {
      const mappedValue = await this.applyMapping(sourceData, sourceField, mapping);
      
      if (mappedValue !== undefined && mappedValue !== null) {
        // Handle different mapping result types
        if (typeof mappedValue === 'object' && !Array.isArray(mappedValue)) {
          // For resolver functions that return objects, merge the results
          Object.assign(mappedData, mappedValue);
        } else {
          // For simple mappings, use the target field name
          const targetField = typeof mapping === 'string' ? mapping : sourceField;
          mappedData[targetField] = mappedValue;
        }
      }
    }

    return mappedData;
  }

  /**
   * Applies individual field mapping based on mapping type
   */
  private async applyMapping(
    sourceData: TSource,
    sourceField: string,
    mapping: any
  ): Promise<any> {
    // Type 1: Simple 1-to-1 mapping (string)
    if (typeof mapping === 'string') {
      return (sourceData as any)[sourceField];
    }

    // Type 2, 3, 4: Function-based mappings
    if (typeof mapping === 'function') {
      const result = mapping(sourceData);
      
      // Handle async resolver functions
      const resolvedResult = await Promise.resolve(result);
      
      // Type 4: Cross-table relation - check if result has model property
      if (this.isCrossTableMapping(resolvedResult)) {
        return await this.handleCrossTableMapping(resolvedResult);
      }
      
      // Type 2 & 3: Simple resolver functions
      return resolvedResult;
    }

    throw new Error(`Unsupported mapping type for field '${sourceField}'`);
  }

  /**
   * Checks if the mapping result is a cross-table mapping
   */
  private isCrossTableMapping(result: any): result is TargetPatch {
    return result && typeof result === 'object' && 'model' in result;
  }

  /**
   * Handles cross-table relationship mapping
   */
  private async handleCrossTableMapping(mapping: TargetPatch): Promise<any> {
    const { model: RelatedModel, ...fieldData } = mapping;
    
    if (!RelatedModel) {
      return fieldData;
    }

    // Create related model instance to get indexKey
    const relatedInstance = new RelatedModel();
    const indexKey = (relatedInstance as ListModel<any, any>).indexKey;
    
    if (!indexKey) {
      throw new Error('Related model must have an indexKey property');
    }

    // Return the foreign key value for the relationship
    // In a real implementation, you might want to look up or create the related record
    const indexKeyStr = String(indexKey);
    return fieldData[indexKeyStr];
  }
}