# MobX RESTful migrator

Data Migration framework based on [MobX-RESTful][1]

[![NPM Dependency](https://img.shields.io/librariesio/github/idea2app/MobX-RESTful-migrator.svg)][2]
[![CI & CD](https://github.com/idea2app/MobX-RESTful-migrator/actions/workflows/main.yml/badge.svg)][3]

[![NPM](https://nodei.co/npm/mobx-restful-migrator.png?downloads=true&downloadRank=true&stars=true)][4]

## Overview

MobX-RESTful-migrator is a TypeScript library that provides a flexible data migration framework built on top of MobX-RESTful's ListModel abstraction. It allows you to migrate data from various sources through MobX-RESTful models with customizable field mappings and relationships.

## Features

- **Flexible Field Mappings**: Support for four different mapping types
- **Async Generator Pattern**: Control migration flow at your own pace
- **Cross-table Relationships**: Handle complex data relationships
- **Event-Driven Architecture**: Built-in console logging with customizable event bus
- **TypeScript Support**: Full TypeScript support with type safety

## Installation

```bash
npm install mobx-restful mobx-restful-migrator
```

## Usage Example: Database migration

The typical use case is migrating data between 2 databases via RESTful API:

- **Source**: Article table with Title, Keywords, Content, Author, Email fields
- **Target**: Keywords field splits into Category string & Tags array, Author & Email fields map to User table

### Source Data Schema

```typescript
interface SourceArticle {
  id: number;
  title: string;
  subtitle: string;
  keywords: string; // comma-separated keywords to split into category & tags
  content: string;
  author: string; // maps to User table "name" field
  email: string; // maps to User table "email" field
}
```

### Target Models

```typescript
import { HTTPClient } from 'koajax';
import { ListModel, DataObject, Filter, IDType, toggle } from 'mobx-restful';
import { buildURLData } from 'web-utility';

export abstract class TableModel<
  D extends DataObject,
  F extends Filter<D> = Filter<D>,
> extends ListModel<D, F> {
  client = new HTTPClient({ baseURI: 'http://localhost:8080', responseType: 'json' });

  @toggle('uploading')
  async updateOne(data: Filter<D>, id?: IDType) {
    const { body } = await (id
      ? this.client.put<D>(`${this.baseURI}/${id}`, data)
      : this.client.post<D>(this.baseURI, data));

    return (this.currentOne = body!);
  }

  async loadPage(pageIndex: number, pageSize: number, filter: F) {
    const { body } = await this.client.get<{ list: D[]; count: number }>(
      `${this.baseURI}?${buildURLData({ ...filter, pageIndex, pageSize })}`,
    );
    return { pageData: body!.list, totalCount: body!.count };
  }
}

export interface User {
  id: number;
  name: string;
  email?: string;
}

export interface Article {
  id: number;
  title: string;
  category: string;
  tags: string[];
  content: string;
  author: User;
}

export class UserModel extends TableModel<User> {
  baseURI = '/users';
}

export class ArticleModel extends TableModel<Article> {
  baseURI = '/articles';
}
```

### Migration Configuration

First, export your CSV data file `articles.csv` from an Excel file or Old database:

```csv
title,subtitle,keywords,content,author,email
Introduction to TypeScript,A Comprehensive Guide,"typescript,javascript,programming","TypeScript is a typed superset of JavaScript...",John Doe,john@example.com
MobX State Management,Made Simple,"mobx,react,state-management","MobX makes state management simple...",Jane Smith,jane@example.com
```

Then implement the migration:

```typescript
#! /usr/bin/env tsx

import { RestMigrator, MigrationSchema, ConsoleLogger } from 'mobx-restful-migrator';
import { FileHandle, open } from 'fs/promises';
import { readTextTable } from 'web-utility';

import { SourceArticle, Article, ArticleModel, UserModel } from './source';

// Load and parse CSV data using async streaming for large files
async function* readCSV<T extends object>(path: string) {
  let fileHandle: FileHandle | undefined;

  try {
    fileHandle = await open(path);

    const stream = fileHandle.createReadStream({ encoding: 'utf-8' });

    yield* readTextTable<T>(stream, true) as AsyncGenerator<T>;
  } finally {
    await fileHandle?.close();
  }
}

const loadSourceArticles = () => readCSV<SourceArticle>('article.csv');

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
  // 3. Cross-table relationship: Author & Email → User table
  author: ({ author, email }) => ({
    author: {
      value: { name: author, email },
      model: UserModel, // Maps to User table via ListModel
    },
  }),
};

// Run migration with built-in console logging (default)
const migrator = new RestMigrator(loadSourceArticles, ArticleModel, mapping);

// The ConsoleLogger automatically logs each step:
// - saved No.X: successful migrations with source, mapped, and target data
// - skipped No.X: skipped items (duplicate unique fields)
// - error at No.X: migration errors with details

for await (const { title } of migrator.boot()) {
  // Process the migrated target objects
  console.log(`Successfully migrated article: ${title}`);
}
```

In the end, run your script with a TypeScript runtime:

```bash
tsx your-migration.ts 1> saved.log 2> error.log
```

### Optional: Use custom event bus

```typescript
class CustomEventBus implements MigrationEventBus<SourceArticle, Article> {
  async save({ index, targetItem }) {
    console.info(`✅ Migrated article ${index}: ${targetItem?.title}`);
  }

  async skip({ index, error }) {
    console.warn(`⚠️  Skipped article ${index}: ${error?.message}`);
  }

  async error({ index, error }) {
    console.error(`❌ Error at article ${index}: ${error?.message}`);
  }
}

const migratorWithCustomLogger = new RestMigrator(
  loadSourceArticles,
  ArticleModel,
  mapping,
  new CustomEventBus(),
);
```

## Usage Example: Data crawler

A simple data crawler that fetches data from a RESTful API and saves it to a local YAML file:

```typescript
import { RestMigrator, YAMLListModel } from 'mobx-restful-migrator';
import { sleep } from 'web-utility';

interface CrawledData {
  fieldA: string;
  fieldB: number;
  fieldC: boolean;
  // ...
}

async function* dataSource(): AsyncGenerator<CrawledData> {
  for (let i = 1; i <= 100; i++) {
    const response = await fetch(`https://api.example.com/page/${i}`);

    yield* await response.json();
  }
}

class TargetListModel extends YAMLListModel<CrawledData> {
  constructor() {
    super('.data/crawled.yml');
  }
}

const crawler = new RestMigrator(dataSource, TargetListModel, {
  fieldA: 'fieldA',
  fieldB: 'fieldB',
  fieldC: 'fieldC',
  // ...
});
for await (const item of crawler.boot()) await sleep();
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

The migrator includes a built-in Event Bus for monitoring and controlling the migration process:

### Built-in Console Logging

By default, RestMigrator uses the `ConsoleLogger` which provides detailed console output:

```typescript
import { RestMigrator, ConsoleLogger } from 'mobx-restful-migrator';

import { loadSourceArticles, ArticleModel, mapping } from './source';

// ConsoleLogger is used by default
const migrator = new RestMigrator(loadSourceArticles, ArticleModel, mapping);

for await (const { title } of migrator.boot()) {
  // Console automatically shows:
  // - saved No.X with source, mapped, and target data tables
  // - skipped No.X for duplicate unique fields
  // - error at No.X for migration errors

  // Your processing logic here
  console.log(`✅ Article migrated: ${title}`);
}
```

### Custom Event Handling

Implement your own Event Bus for custom logging and monitoring:

```typescript
import { MigrationEventBus, MigrationProgress } from 'mobx-restful-migrator';
import { outputJSON } from 'fs-extra';

import { SourceArticle, Article, loadSourceArticles, ArticleModel, mapping } from './source';

class FileLogger implements MigrationEventBus<SourceArticle, Article> {
  bootedAt = new Date().toJSON();

  async save({ index, sourceItem, targetItem }: MigrationProgress<SourceArticle, Article>) {
    // Log to file, send notifications, etc.
    await outputJSON(`logs/save-${this.bootedAt}.json`, {
      type: 'success',
      index,
      sourceId: sourceItem?.id,
      targetId: targetItem?.id,
      savedAt: new Date().toJSON(),
    });
  }

  async skip({ index, sourceItem, error }: MigrationProgress<SourceArticle, Article>) {
    await outputJSON(`logs/skip-${this.bootedAt}.json`, {
      type: 'skipped',
      index,
      sourceId: sourceItem?.id,
      error: error?.message,
      skippedAt: new Date().toJSON(),
    });
  }

  async error({ index, sourceItem, error }: MigrationProgress<SourceArticle, Article>) {
    await outputJSON(`logs/error-${this.bootedAt}.json`, {
      type: 'error',
      index,
      sourceId: sourceItem?.id,
      error: error?.message,
      errorAt: new Date().toJSON(),
    });
  }
}

const migrator = new RestMigrator(loadSourceArticles, ArticleModel, mapping, new FileLogger());
```

[1]: https://github.com/idea2app/MobX-RESTful
[2]: https://libraries.io/npm/mobx-restful-migrator
[3]: https://github.com/idea2app/MobX-RESTful-migrator/actions/workflows/main.yml
[4]: https://nodei.co/npm/mobx-restful-migrator/
