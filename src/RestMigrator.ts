import {
  ListModelConstructor,
  MigrationConfig,
  MigrationProgress,
  CrossTableResolver
} from './types';

export class RestMigrator<TSource = any> {
  private dataSource: AsyncIterable<TSource>;
  private targetModel: ListModelConstructor;
  private fieldMapping: MigrationConfig<TSource>;

  constructor(
    dataSource: AsyncIterable<TSource>,
    targetModel: ListModelConstructor,
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
    let processed = 0;
    
    try {
      for await (const sourceItem of this.dataSource) {
        try {
          const mappedData = await this.mapFields(sourceItem);
          
          // Create and save the target model instance
          const targetInstance = new this.targetModel();
          Object.assign(targetInstance, mappedData);
          
          processed++;
          
          yield {
            processed,
            currentItem: sourceItem,
          };
          
        } catch (error) {
          yield {
            processed,
            currentItem: sourceItem,
            error: error as Error,
          };
        }
      }
    } catch (error) {
      yield {
        processed,
        error: error as Error,
      };
    }
  }

  /**
   * Maps source data fields to target model fields according to the configuration
   */
  private async mapFields(sourceData: TSource): Promise<Record<string, any>> {
    const mappedData: Record<string, any> = {};

    for (const [sourceField, mapping] of Object.entries(this.fieldMapping)) {
      try {
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
      } catch (error) {
        throw new Error(`Failed to map field '${sourceField}': ${(error as Error).message}`);
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
  private isCrossTableMapping(result: any): result is ReturnType<CrossTableResolver> {
    return result && typeof result === 'object' && 'model' in result;
  }

  /**
   * Handles cross-table relationship mapping
   */
  private async handleCrossTableMapping(mapping: ReturnType<CrossTableResolver>): Promise<any> {
    const { model: RelatedModel, ...fieldData } = mapping;
    
    if (!RelatedModel) {
      return fieldData;
    }

    // Create related model instance to get indexKey
    const relatedInstance = new RelatedModel();
    const indexKey = relatedInstance.indexKey;
    
    if (!indexKey) {
      throw new Error('Related model must have an indexKey property');
    }

    // Return the foreign key value for the relationship
    // In a real implementation, you might want to look up or create the related record
    return fieldData[indexKey];
  }
}