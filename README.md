# MobX-RESTful-migrator

Data Migration framework based on MobX-RESTful

## Overview

MobX-RESTful-migrator is a TypeScript library that provides a flexible and powerful data migration framework built on top of MobX-RESTful's ListModel abstraction. It allows you to migrate data from various sources to MobX-RESTful models with customizable field mappings and relationships.

## Features

- **Flexible Field Mappings**: Support for multiple mapping types
- **Async Generator Pattern**: Control migration flow at your own pace
- **Cross-table Relationships**: Handle complex data relationships
- **Error Handling**: Comprehensive error handling and progress reporting
- **TypeScript Support**: Full TypeScript support with type safety

## Installation

```bash
npm install mobx-restful-migrator
```

## Usage

### Basic Example

```typescript
import { RestMigrator } from 'mobx-restful-migrator';

// Define your target model
class UserModel {
  indexKey = 'id';
  id?: number;
  name?: string;
  email?: string;
}

// Your data source (async generator)
async function* dataSource() {
  yield { user_id: 1, full_name: 'John Doe', email_address: 'john@example.com' };
  yield { user_id: 2, full_name: 'Jane Smith', email_address: 'jane@example.com' };
}

// Field mapping configuration
const fieldMapping = {
  user_id: 'id',           // 1-to-1 mapping
  full_name: 'name',       // 1-to-1 mapping  
  email_address: 'email'   // 1-to-1 mapping
};

// Create migrator
const migrator = new RestMigrator(dataSource(), UserModel, fieldMapping);

// Run migration
for await (const progress of migrator.boot()) {
  console.log(`Processed: ${progress.processed} items`);
  if (progress.error) {
    console.error('Migration error:', progress.error);
  }
}
```

## Mapping Types

### 1. One-to-One Simple Mapping

Map source field directly to target field:

```typescript
const mapping = {
  user_id: 'id',
  full_name: 'name'
};
```

### 2. One-to-Many Mapping with Resolver

Use a resolver function to map one source field to multiple target fields:

```typescript
const mapping = {
  full_name: (data) => ({
    firstName: data.full_name.split(' ')[0],
    lastName: data.full_name.split(' ')[1]
  })
};
```

### 3. Many-to-One Mapping with Resolver

Use a resolver function to combine multiple source fields:

```typescript
const mapping = {
  birth_year: (data) => ({
    age: new Date().getFullYear() - data.birth_year
  })
};
```

### 4. Cross-Table Relationships

Handle relationships with other models:

```typescript
class CompanyModel {
  indexKey = 'companyId';
  companyId?: number;
  name?: string;
}

const mapping = {
  company_info: (data) => ({
    companyId: data.company_info.id,
    model: CompanyModel  // Specify the related model
  })
};
```

## Advanced Example

```typescript
import { RestMigrator } from 'mobx-restful-migrator';

// Source data interface
interface SourceUser {
  user_id: number;
  full_name: string;
  email_address: string;
  birth_year: number;
  company_info: {
    id: number;
    name: string;
  };
}

// Target models
class UserModel {
  indexKey = 'id';
  id?: number;
  name?: string;
  email?: string;
  age?: number;
  companyId?: number;
}

class CompanyModel {
  indexKey = 'companyId';
  companyId?: number;
  name?: string;
}

// Complex mapping with all types
const complexMapping = {
  // Simple 1-to-1 mappings
  user_id: 'id',
  email_address: 'email',
  
  // 1-to-many mapping
  full_name: (data: SourceUser) => ({
    name: data.full_name.toUpperCase()
  }),
  
  // Many-to-1 computed mapping
  birth_year: (data: SourceUser) => ({
    age: new Date().getFullYear() - data.birth_year
  }),
  
  // Cross-table relationship
  company_info: (data: SourceUser) => ({
    companyId: data.company_info.id,
    model: CompanyModel
  })
};

// Async data source
async function* fetchUsers(): AsyncGenerator<SourceUser> {
  const users = await fetch('/api/users').then(r => r.json());
  for (const user of users) {
    yield user;
  }
}

// Run migration with progress tracking
const migrator = new RestMigrator(fetchUsers(), UserModel, complexMapping);

for await (const progress of migrator.boot()) {
  console.log(`Progress: ${progress.processed} items processed`);
  
  if (progress.error) {
    console.error(`Error processing item:`, progress.currentItem);
    console.error(`Error details:`, progress.error.message);
  } else {
    console.log(`Successfully migrated:`, progress.currentItem);
  }
}
```

## API Reference

### RestMigrator\<TSource>

Main migration class.

#### Constructor

```typescript
constructor(
  dataSource: AsyncIterable<TSource>,
  targetModel: ListModelConstructor,
  fieldMapping: MigrationConfig<TSource>
)
```

- `dataSource`: Async iterable providing source data
- `targetModel`: Target MobX-RESTful model class
- `fieldMapping`: Configuration object defining field mappings

#### Methods

##### boot(): AsyncGenerator\<MigrationProgress>

Runs the migration process and yields progress information.

```typescript
interface MigrationProgress {
  processed: number;     // Number of items processed
  total?: number;        // Total items (if known)
  currentItem?: any;     // Current item being processed
  error?: Error;         // Error if migration failed for this item
}
```

### Types

#### MigrationConfig\<TSource>

Configuration object defining how to map fields:

```typescript
interface MigrationConfig<TSource> {
  [sourceField: string]: FieldMapping<TSource>;
}
```

#### FieldMapping\<TSource>

Union type for different mapping strategies:

```typescript
type FieldMapping<TSource> = 
  | string                                           // Simple 1-to-1 mapping
  | ResolverFunction<TSource, Record<string, any>>   // Resolver function
  | CrossTableResolver<TSource>;                     // Cross-table relationship
```

## Error Handling

The migrator provides comprehensive error handling:

```typescript
for await (const progress of migrator.boot()) {
  if (progress.error) {
    // Handle individual item errors
    console.error(`Failed to migrate item:`, progress.currentItem);
    console.error(`Error:`, progress.error.message);
    
    // Continue processing other items
    continue;
  }
  
  // Process successful migration
  console.log(`Successfully processed item ${progress.processed}`);
}
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
