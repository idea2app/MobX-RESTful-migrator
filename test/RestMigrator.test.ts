import 'core-js/es/array/from-async';
import { sleep } from 'web-utility';

import { RestMigrator } from '../src/RestMigrator';
import { MigrationSchema } from '../src/types';
import { createSourceStream, SourceArticle } from './example/source';
import { ArticleModel, UserModel, Article } from './example/target';

describe('RestMigrator', async () => {
  const sampleArticles = await Array.fromAsync(createSourceStream());

  describe('Simple 1-to-1 mapping', () => {
    it('should map fields with simple string mappings', async () => {
      const mapping: MigrationSchema<SourceArticle, Article> = {
        title: ({ title, subtitle }) => ({
          title: { value: `${title}: ${subtitle}` },
        }),
        content: 'content',
      };
      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);

      const results = await Array.fromAsync(migrator.boot());

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty(
        'title',
        'Introduction to TypeScript: A Comprehensive Guide'
      );
      expect(results[0]).toHaveProperty('content', sampleArticles[0].content);
    });
  });

  describe('Keywords to tags array mapping', () => {
    it('should split keywords string into category and tags array', async () => {
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
      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);

      const results = await Array.fromAsync(migrator.boot());

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty(
        'title',
        'Introduction to TypeScript: A Comprehensive Guide'
      );
      expect(results[0]).toHaveProperty('category', 'typescript');
      expect(results[0]).toHaveProperty('tags');
      expect(results[0].tags).toEqual(['javascript', 'programming']);
      expect(results[1]).toHaveProperty('title', 'MobX State Management: Made Simple');
      expect(results[1]).toHaveProperty('category', 'mobx');
      expect(results[1].tags).toEqual(['react', 'state-management']);
    });
  });

  describe('Author/Email to User table mapping', () => {
    it('should map author and email to User model', async () => {
      const mapping: MigrationSchema<SourceArticle, Article> = {
        title: ({ title, subtitle }) => ({
          title: { value: `${title}: ${subtitle}` },
        }),
        content: 'content',
        author: ({ author, email }) => ({
          author: { value: { name: author, email }, model: UserModel },
        }),
      };
      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);

      const results = await Array.fromAsync(migrator.boot());

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('author');
      expect(results[1]).toHaveProperty('author');
    });
  });

  describe('Complete Article migration', () => {
    it('should handle complete article to target tables migration', async () => {
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
      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);

      const results = await Array.fromAsync(migrator.boot());

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty(
        'title',
        'Introduction to TypeScript: A Comprehensive Guide'
      );
      expect(results[0]).toHaveProperty('category', 'typescript');
      expect(results[0]).toHaveProperty('tags');
      expect(results[0]).toHaveProperty('author');
    });
  });

  describe('Async resolver functions', () => {
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
      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);

      const results = await Array.fromAsync(migrator.boot());

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('author');
      expect(results[1]).toHaveProperty('author');
    });
  });
});
