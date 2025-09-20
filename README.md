# MobX-RESTful-migrator

Data Migration framework based on MobX-RESTful

## Overview

MobX-RESTful-migrator is a TypeScript library that provides a flexible data migration framework built on top of MobX-RESTful's ListModel abstraction. It allows you to migrate data from various sources to MobX-RESTful models with customizable field mappings and relationships.

## Features

- **Flexible Field Mappings**: Support for four different mapping types
- **Async Generator Pattern**: Control migration flow at your own pace
- **Cross-table Relationships**: Handle complex data relationships  
- **Event-Driven Architecture**: Built-in console logging with customizable event bus
- **TypeScript Support**: Full TypeScript support with type safety
- **CSV Data Processing**: Built-in CSV file reading and parsing capabilities

## Installation

```bash
npm install mobx-restful mobx-restful-migrator
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
  subtitle: string;
  keywords: string; // comma-separated keywords to split into tags
  content: string;
  author: string; // maps to User table name field
  email: string; // maps to User table email field
}
```

### Target Models

```typescript
import { HTTPClient } from 'koajax';
import { ListModel, Filter, NewData, DataObject } from 'mobx-restful';

export async function* streamOf<T>(items: T[]) {
  for (const item of items) yield item;
}

export abstract class TableModel<T extends DataObject> extends ListModel<T> {
  client = new HTTPClient();

  indexKey = 'id' as const;

  private mockData: T[] = [];

  async loadPage(pageIndex = 1, pageSize = 10, filter: Filter<T>) {
    const filteredList = this.mockData.filter(item =>
      Object.entries(filter).every(([key, value]) => item[key as keyof T] === value)
    );
    const pageData = filteredList.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

    return { pageData, totalCount: filteredList.length };
  }

  async updateOne(data: Partial<NewData<T>>, id?: number) {
    if (id) {
      const index = this.mockData.findIndex(item => item.id === id);

      data = Object.assign(this.mockData[index], data);
    } else {
      data = { id: this.mockData.length + 1, ...data };

      this.mockData.push(data as T);
    }
    return data as T;
  }
}

interface User {
  id: number;
  name: string;
  email?: string;
}

interface Article {
  id: number;
  title: string;
  category: string;
  tags: string[];
  content: string;
  author: User;
}

class UserModel extends TableModel<User> {
  baseURI = '/users';
}

class ArticleModel extends TableModel<Article> {
  baseURI = '/articles';
}
```

### Migration Configuration

First, prepare your CSV data file `articles.csv`:

```csv
title,subtitle,keywords,content,author,email
Introduction to TypeScript,A Comprehensive Guide,"typescript,javascript,programming","TypeScript is a typed superset of JavaScript...",John Doe,john@example.com
MobX State Management,Made Simple,"mobx,react,state-management","MobX makes state management simple...",Jane Smith,jane@example.com
```

Then implement the migration:

```typescript
import { RestMigrator, MigrationSchema, ConsoleLogger } from 'mobx-restful-migrator';
import { FileHandle, open } from 'fs/promises';
import { readTextTable } from 'web-utility';

// Load and parse CSV data using async streaming for large files
async function* getArticles() {
  let fileHandle: FileHandle | undefined;

  try {
    fileHandle = await open('./articles.csv');

    yield* readTextTable<SourceArticle>(fileHandle.createReadStream()) as AsyncGenerator<SourceArticle>;
  } finally {
    await fileHandle?.close();
  }
}

// Complete migration configuration demonstrating all 4 mapping types
const mapping: MigrationSchema<SourceArticle, Article> = {
  // 1. Many-to-One mapping: Title + Subtitle → combined title
  title: ({ title, subtitle }) => ({
    title: { value: `${title}: ${subtitle}` },
  }),

  content: 'content',

  // 2. One-to-Many mapping: Keywords string → category string & tags array
  keywords: ({ keywords }) => {
    const [category, ...tags] = keywords.split(',').map(tag => tag.trim());

    return { category: { value: category }, tags: { value: tags } };
  },

  // 3. Cross-table relationship: Author/Email → User table
  author: ({ author, email }) => ({
    author: {
      value: { name: author, email },
      model: UserModel, // Maps to User table via ListModel
    },
  }),
};

// Run migration with built-in console logging (default)
const migrator = new RestMigrator(getArticles, ArticleModel, mapping);

// The ConsoleLogger automatically logs each step:
// - saved No.X: successful migrations with source, mapped, and target data
// - skipped No.X: skipped items (duplicate unique fields)  
// - error at No.X: migration errors with details

for await (const result of migrator.boot()) {
  // Process the migrated target objects
  console.log(`Successfully migrated article: ${result.title}`);
}

// Optional: Use custom event bus
class CustomEventBus implements MigrationEventBus<SourceArticle, Article> {
  async save({ index, targetItem }) {
    console.log(`✅ Migrated article ${index}: ${targetItem?.title}`);
  }
  
  async skip({ index, error }) {
    console.log(`⚠️  Skipped article ${index}: ${error?.message}`);
  }
  
  async error({ index, error }) {
    console.log(`❌ Error at article ${index}: ${error?.message}`);
  }
}

const migratorWithCustomLogger = new RestMigrator(
  getArticles, 
  ArticleModel, 
  mapping,
  new CustomEventBus()
);
```

## Four Mapping Types

### 1. Simple 1-to-1 Mapping

Map source field directly to target field using string mapping:

```typescript
const mapping: MigrationSchema<SourceArticle, Article> = {
  title: 'title',
  content: 'content',
};
```

### 2. Many-to-One Mapping

Use resolver function to combine multiple source fields into one target field:

```typescript
const mapping: MigrationSchema<SourceArticle, Article> = {
  title: ({ title, subtitle }) => ({
    title: { value: `${title}: ${subtitle}` },
  }),
};
```

### 3. One-to-Many Mapping

Use resolver function to map one source field to multiple target fields with `value` property:

```typescript
const mapping: MigrationSchema<SourceArticle, Article> = {
  keywords: ({ keywords }) => {
    const [category, ...tags] = keywords.split(',').map(tag => tag.trim());

    return { category: { value: category }, tags: { value: tags } };
  },
};
```

### 4. Cross-Table Relationships

Use resolver function with `model` property for related tables:

```typescript
const mapping: MigrationSchema<SourceArticle, Article> = {
  author: ({ author, email }) => ({
    author: {
      value: { name: author, email },
      model: UserModel, // References User ListModel
    },
  }),
};
```

## Event-Driven Migration Architecture

The migrator includes a built-in event system for monitoring and controlling the migration process:

### Built-in Console Logging

By default, RestMigrator uses the `ConsoleLogger` which provides detailed console output:

```typescript
import { RestMigrator, ConsoleLogger } from 'mobx-restful-migrator';

// ConsoleLogger is used by default
const migrator = new RestMigrator(getArticles, ArticleModel, mapping);

for await (const result of migrator.boot()) {
  // Console automatically shows:
  // - saved No.X with source, mapped, and target data tables
  // - skipped No.X for duplicate unique fields  
  // - error at No.X for migration errors
  
  // Your processing logic here
  console.log(`✅ Article migrated: ${result.title}`);
}
```

### Custom Event Handling

Implement your own event bus for custom logging and monitoring:

```typescript
import { MigrationEventBus, MigrationProgress } from 'mobx-restful-migrator';
import { writeFile } from 'fs/promises';

class DatabaseLogger implements MigrationEventBus<SourceArticle, Article> {
  async save({ index, sourceItem, targetItem }: MigrationProgress<SourceArticle, Article>) {
    // Log to database, send notifications, etc. using async file operations
    const logEntry = JSON.stringify({ 
      type: 'success', 
      index, 
      sourceId: sourceItem?.id, 
      targetId: targetItem?.id,
      timestamp: new Date().toISOString()
    });
    await writeFile(`./logs/migration-${Date.now()}.json`, logEntry);
    await logToDatabase('success', { index, sourceId: sourceItem?.id, targetId: targetItem?.id });
  }
  
  async skip({ index, error }: MigrationProgress<SourceArticle, Article>) {
    const logEntry = JSON.stringify({ 
      type: 'skip', 
      index, 
      reason: error?.message,
      timestamp: new Date().toISOString()
    });
    await writeFile(`./logs/skip-${Date.now()}.json`, logEntry);
    await logToDatabase('skip', { index, reason: error?.message });
  }
  
  async error({ index, error }: MigrationProgress<SourceArticle, Article>) {
    const logEntry = JSON.stringify({ 
      type: 'error', 
      index, 
      error: error?.message,
      timestamp: new Date().toISOString()
    });
    await writeFile(`./logs/error-${Date.now()}.json`, logEntry);
    await logToDatabase('error', { index, error: error?.message });
    await sendErrorAlert(error);
  }
}

const migrator = new RestMigrator(getArticles, ArticleModel, mapping, new DatabaseLogger());
```
