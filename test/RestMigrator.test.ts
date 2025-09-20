import 'core-js/es/array/from-async';
import { sleep } from 'web-utility';

import { RestMigrator } from '../src/RestMigrator';
import { MigrationSchema } from '../src/types';
import { loadSourceArticles, SourceArticle } from './example/source';
import { ArticleModel, UserModel, Article } from './example/target';

describe('RestMigrator', () => {
  let sampleArticles: SourceArticle[];

  beforeAll(async () => (sampleArticles = await Array.fromAsync(loadSourceArticles())));

  it('should handle Simple 1-to-1 mapping', async () => {
    const mapping: MigrationSchema<SourceArticle, Article> = {
      title: ({ title, subtitle }) => ({
        title: { value: `${title}: ${subtitle}` },
      }),
      content: 'content',
    };
    const migrator = new RestMigrator(loadSourceArticles, ArticleModel, mapping);

    const results = await Array.fromAsync(migrator.boot());

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('title', 'Introduction to TypeScript: A Comprehensive Guide');
    expect(results[0]).toHaveProperty('content', sampleArticles[0].content);
  });

  it('should handle 1-to-Many mapping', async () => {
    const mapping: MigrationSchema<SourceArticle, Article> = {
      title: ({ title, subtitle }) => ({
        title: { value: `${title}: ${subtitle}` },
      }),
      content: 'content',
      keywords: ({ keywords }) => {
        const [category, ...tags] = keywords.split(',').map(tag => tag.trim());

        return { category: { value: category }, tags: { value: tags } };
      },
    };
    const migrator = new RestMigrator(loadSourceArticles, ArticleModel, mapping);

    const results = await Array.fromAsync(migrator.boot());

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('title', 'Introduction to TypeScript: A Comprehensive Guide');
    expect(results[0]).toHaveProperty('category', 'typescript');
    expect(results[0]).toHaveProperty('tags');
    expect(results[0].tags).toEqual(['javascript', 'programming']);
    expect(results[1]).toHaveProperty('title', 'MobX State Management: Made Simple');
    expect(results[1]).toHaveProperty('category', 'mobx');
    expect(results[1].tags).toEqual(['react', 'state-management']);
  });

  it('should handle Many-to-1 & Relation mapping', async () => {
    const mapping: MigrationSchema<SourceArticle, Article> = {
      title: ({ title, subtitle }) => ({
        title: { value: `${title}: ${subtitle}` },
      }),
      content: 'content',
      author: ({ author, email }) => ({
        author: { value: { name: author, email }, model: UserModel },
      }),
    };
    const migrator = new RestMigrator(loadSourceArticles, ArticleModel, mapping);

    const results = await Array.fromAsync(migrator.boot());

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('author');
    expect(results[0].author).toHaveProperty('name', sampleArticles[0].author);
    expect(results[0].author).toHaveProperty('email', sampleArticles[0].email);
    expect(results[1]).toHaveProperty('author');
    expect(results[1].author).toHaveProperty('name', sampleArticles[1].author);
    expect(results[1].author).toHaveProperty('email', sampleArticles[1].email);
  });

  it('should handle Complex migration', async () => {
    const mapping: MigrationSchema<SourceArticle, Article> = {
      title: ({ title, subtitle }) => ({
        title: { value: `${title}: ${subtitle}` },
      }),
      content: 'content',
      keywords: ({ keywords }) => {
        const [category, ...tags] = keywords.split(',').map(tag => tag.trim());

        return { category: { value: category }, tags: { value: tags } };
      },
      author: ({ author, email }) => ({
        author: { value: { name: author, email }, model: UserModel },
      }),
    };
    const migrator = new RestMigrator(loadSourceArticles, ArticleModel, mapping);

    const results = await Array.fromAsync(migrator.boot());

    expect(results).toHaveLength(2);
    expect(results[0]).toHaveProperty('title', 'Introduction to TypeScript: A Comprehensive Guide');
    expect(results[0]).toHaveProperty('category', 'typescript');
    expect(results[0]).toHaveProperty('tags');
    expect(results[0].author).toBeInstanceOf(Object);
  });

  it('should handle async resolver functions', async () => {
    const mapping: MigrationSchema<SourceArticle, Article> = {
      title: ({ title, subtitle }) => ({
        title: { value: `${title}: ${subtitle}` },
      }),
      author: async ({ author, email }) => {
        await sleep(0.01); // Simulate async user lookup/creation

        return { author: { value: { name: author, email }, model: UserModel } };
      },
    };
    const migrator = new RestMigrator(loadSourceArticles, ArticleModel, mapping);

    const results = await Array.fromAsync(migrator.boot());

    expect(results).toHaveLength(2);
    expect(results[0].author).toBeInstanceOf(Object);
    expect(results[1].author).toBeInstanceOf(Object);
  });
});
