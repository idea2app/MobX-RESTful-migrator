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
  keywords: string;  // comma-separated keywords to split into tags
  content: string;
  author: string;    // maps to User table name field
  email: string;     // maps to User table email field
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

```typescript
import { RestMigrator } from 'mobx-restful-migrator';
import { parseCSV } from 'web-utility';

// Sample CSV data
const csvData = `title,subtitle,keywords,content,author,email
Introduction to TypeScript,A Comprehensive Guide,"typescript,javascript,programming","TypeScript is a typed superset of JavaScript...",John Doe,john@example.com
MobX State Management,Made Simple,"mobx,react,state-management","MobX makes state management simple...",Jane Smith,jane@example.com`;

// Parse CSV data into source articles
async function* getArticles() {
  const articles = parseCSV(csvData, { head: true });
  for (const article of articles) {
    yield article;
  }
}

// Complete migration configuration demonstrating all 4 mapping types
const mapping: MigrationConfig<SourceArticle, Article> = {
  // 1. Many-to-One mapping: Title + Subtitle → combined title
  title: ({ title, subtitle }) => ({
    title: { value: `${title}: ${subtitle}` }
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
    console.log(`Article successfully migrated with ${result.tags.length} tags`);
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
  title: 'title',
  content: 'content'
};
```

### 2. Many-to-One Mapping  
Use resolver function to combine multiple source fields into one target field:
```typescript
const mapping = {
  title: ({ title, subtitle }) => ({
    title: { value: `${title}: ${subtitle}` }
  })
};
```

### 3. One-to-Many Mapping
Use resolver function to map one source field to multiple target fields with `value` property:
```typescript
const mapping = {
  keywords: ({ keywords }) => {
    const [category, ...tags] = keywords.split(',').map(tag => tag.trim());
  
    return { category: { value: category }, tags: { value: tags } };
  }
};
```

### 4. Cross-Table Relationships
Use resolver function with `model` property for related tables:
```typescript
const mapping = {
  author: ({ author, email }) => ({
    author: {
      value: { name: author, email },
      model: UserModel  // References User ListModel
    }
  })
};
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
