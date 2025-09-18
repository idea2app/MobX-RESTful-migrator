# MobX-RESTful-migrator

Data Migration framework based on MobX-RESTful

## Overview

MobX-RESTful-migrator is a TypeScript library that provides a flexible data migration framework built on top of MobX-RESTful's ListModel abstraction. It allows you to migrate data from various sources to MobX-RESTful models with customizable field mappings and relationships.

## Features

- **Flexible Field Mappings**: Support for four different mapping types
- **Async Generator Pattern**: Control migration flow at your own pace  
- **Cross-table Relationships**: Handle complex data relationships
- **User-Controlled Error Handling**: You manage counting and error handling externally
- **TypeScript Support**: Full TypeScript support with type safety

## Installation

```bash
npm install mobx-restful-migrator
```

## Usage Example: Article Migration

The typical use case is migrating article data with the following schema:
- **Source**: Article table with Title, Keywords, Content, Author, Email fields
- **Target**: Keywords field splits into tags array, Author/Email fields map to User table

### Source Data Schema

```typescript
interface SourceArticle {
  id: number;
  title: string;
  keywords: string;  // comma-separated keywords to split into tags
  content: string;
  author: string;    // maps to User table name field
  email: string;     // maps to User table email field
}
```

### Target Models

```typescript
import { HTTPClient } from 'koajax';
import { ListModel } from 'mobx-restful';

interface User {
  id: number;
  name: string;
  email?: string;
}

class UserModel extends ListModel<User> {
  indexKey = 'id' as const;
  client = new HTTPClient();
  baseURI = '/api/users';

  async loadPage(pageIndex: number, pageSize: number, filter: any) {
    return {
      pageData: [],
      totalCount: 0,
    };
  }
}

interface Article {
  id: number;
  title: string;
  tags: string[];    // split from keywords field
  content: string;
  author: User;      // User object from User table
}

class ArticleModel extends ListModel<Article> {
  indexKey = 'id' as const;
  client = new HTTPClient();
  baseURI = '/api/articles';

  async loadPage(pageIndex: number, pageSize: number, filter: any) {
    return {
      pageData: [],
      totalCount: 0,
    };
  }
}
```

### Migration Configuration

```typescript
import { RestMigrator } from 'mobx-restful-migrator';

// Sample source data
async function* getArticles() {
  const articles = [
    {
      id: 1,
      title: 'Introduction to TypeScript',
      keywords: 'typescript,javascript,programming',
      content: 'TypeScript is a typed superset of JavaScript...',
      author: 'John Doe',
      email: 'john@example.com'
    },
    {
      id: 2,
      title: 'MobX State Management',
      keywords: 'mobx,react,state-management',
      content: 'MobX makes state management simple...',
      author: 'Jane Smith',
      email: 'jane@example.com'
    }
  ];
  
  for (const article of articles) {
    yield article;
  }
}

// Complete migration configuration demonstrating all 4 mapping types
const mapping: MigrationConfig<SourceArticle, Article> = {
  // 1. Simple 1-to-1 mappings
  id: 'id',
  title: 'title', 
  content: 'content',
  
  // 2. One-to-Many mapping: Keywords string → tags array
  keywords: (data: SourceArticle) => ({
    tags: { value: data.keywords.split(',').map(tag => tag.trim()) }
  }),
  
  // 3. Cross-table relationship: Author/Email → User table
  author: (data: SourceArticle) => ({
    author: {
      value: { name: data.author, email: data.email },
      model: UserModel  // Maps to User table via ListModel
    }
  })
};

// Run migration with user-controlled counting and error handling
const migrator = new RestMigrator(getArticles, ArticleModel, mapping);

let count = 0;
for await (const result of migrator.boot()) {
  count++;
  console.log(`Processed: ${count} articles`);
  console.log(`Migrated article: ${result.title}`);
  
  // Users handle their own error management
  try {
    // Process the migrated data as needed
    console.log(`Article ${result.id} successfully migrated`);
  } catch (error) {
    console.error(`Error processing article ${count}:`, error);
    // Continue processing or break as needed
  }
}

console.log(`Migration completed. Total: ${count} articles processed`);
```

## Four Mapping Types

### 1. Simple 1-to-1 Mapping
Map source field directly to target field using string mapping:
```typescript
const mapping = {
  id: 'id',
  title: 'title'
};
```

### 2. One-to-Many Mapping  
Use resolver function to map one source field to multiple target fields with `value` property:
```typescript
const mapping = {
  keywords: (data) => ({
    tags: { value: data.keywords.split(',').map(tag => tag.trim()) },
    tagCount: { value: data.keywords.split(',').length }
  })
};
```

### 3. Many-to-One Mapping
Use resolver function to compute target field from source data with `value` property:
```typescript
const mapping = {
  content: (data) => ({
    wordCount: { value: data.content.split(' ').length },
    charCount: { value: data.content.length }
  })
};
```

### 4. Cross-Table Relationships
Use resolver function with `model` property for related tables:
```typescript
const mapping = {
  author: (data) => ({
    author: {
      value: { name: data.author, email: data.email },
      model: UserModel  // References User ListModel
    }
  })
};
```

## API Reference

### RestMigrator\<TSource>

#### Constructor
```typescript
constructor(
  dataSource: () => AsyncGenerator<TSource>,
  targetModel: ListModelClass,
  fieldMapping: MigrationConfig<TSource>
)
```

#### boot(): AsyncGenerator\<TTarget>
Returns an async generator that yields migrated target objects. Counting and error handling are left to the user for maximum flexibility.

```typescript
for await (const result of migrator.boot()) {
  // result is the migrated target object
  console.log(`Migrated: ${result.title}`);
}
```

## User-Controlled Migration Flow

The migrator yields control back to you for each item, allowing flexible error handling and progress tracking:

```typescript
let successCount = 0;
let errorCount = 0;

for await (const result of migrator.boot()) {
  try {
    // Your custom processing logic here
    console.log(`Processing: ${result.title}`);
    successCount++;
  } catch (error) {
    console.error('Migration error:', error);
    errorCount++;
    // Decide whether to continue or break
  }
}

console.log(`Migration completed: ${successCount} successful, ${errorCount} errors`);
```

## Configuration Format

The migration configuration uses the `TargetPatch` format where each field mapping can specify:

- `value`: The actual value to assign
- `unique`: Whether to check for uniqueness (optional)
- `model`: The ListModel class for cross-table relationships (optional)

```typescript
type TargetPatch<T> = {
  [K in keyof T]?: {
    value?: Partial<T[K]>;
    unique?: boolean;
    model?: Constructor<ListModel>;
  };
};
```

This provides a consistent, type-safe way to handle all mapping scenarios while maintaining the flexibility needed for complex data migration workflows.
```typescript
const mapping = {
  author: (data) => ({
    name: data.author,
    email: data.email,
    model: UserModel  // References User ListModel
  })
};
```

## API Reference

### RestMigrator\<TSource>

#### Constructor
```typescript
constructor(
  dataSource: AsyncIterable<TSource>,
  targetModel: ListModelClass,
  fieldMapping: MigrationConfig<TSource>
)
```

#### boot(): AsyncGenerator\<MigrationProgress>
Returns an async generator that yields progress information. Counting and error handling are left to the user for maximum flexibility.

```typescript
interface MigrationProgress {
  processed: number;    // Set to 0 - users handle counting externally
  currentItem?: any;    // Current source item being processed
}
```

## User-Controlled Migration Flow

The migrator yields control back to you for each item, allowing flexible error handling and progress tracking:

```typescript
let successCount = 0;
let errorCount = 0;

for await (const progress of migrator.boot()) {
  try {
    // Your custom processing logic here
    console.log(`Processing: ${progress.currentItem.title}`);
    successCount++;
  } catch (error) {
    console.error('Migration error:', error);
    errorCount++;
    // Decide whether to continue or break
  }
}

console.log(`Results: ${successCount} success, ${errorCount} errors`);
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
