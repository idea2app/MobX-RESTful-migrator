import { RestMigrator } from '../src/RestMigrator';
import { MigrationConfig } from '../src/types';

import { createSourceStream, sampleArticles, SourceArticle } from './example/source';
import { ArticleModel } from './example/target';

describe('RestMigrator', () => {
  describe('Simple 1-to-1 mapping', () => {
    it('should map fields with simple string mappings', async () => {
      const migrator = new RestMigrator(createSourceStream, ArticleModel, {
        title: 'title',
        content: 'content',
      });
      const results = await Array.fromAsync(migrator.boot());

      expect(results).toHaveLength(2);

      expect(results[0]).toEqual({
        title: sampleArticles[0].title,
        content: sampleArticles[0].content,
      });
      expect(results[1]).toEqual({
        title: sampleArticles[1].title,
        content: sampleArticles[1].content,
      });
    });
  });

  describe('Keywords to tags array mapping', () => {
    it('should split keywords string into tags array', async () => {
      const mapping: MigrationConfig<SourceArticle> = {
        keywords: data => ({
          tags: data.keywords.split(',').map(tag => tag.trim()),
        }),
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleArticles),
        TestArticleModel,
        mapping
      );

      const results = [];
      for await (const progress of migrator.boot()) {
        results.push(progress);
      }

      expect(results).toHaveLength(2);
      expect(results.every(r => !r.error)).toBe(true);
    });
  });

  describe('Author/Email to User table mapping', () => {
    it('should map author and email to User model', async () => {
      const mapping: MigrationConfig<SourceArticle> = {
        author: data => ({
          name: data.author,
          email: data.email,
          model: TestUserModel,
        }),
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleArticles),
        TestArticleModel,
        mapping
      );

      const results = [];
      for await (const progress of migrator.boot()) {
        results.push(progress);
      }

      expect(results).toHaveLength(2);
      expect(results.every(r => !r.error)).toBe(true);
    });
  });

  describe('Complete Article migration', () => {
    it('should handle complete article to target tables migration', async () => {
      const mapping: MigrationConfig<SourceArticle> = {
        id: 'id',
        title: 'title',
        content: 'content',
        keywords: data => ({
          tags: data.keywords.split(',').map(tag => tag.trim()),
        }),
        author: data => ({
          authorId: 1, // In real scenario, would lookup/create user
          model: TestUserModel,
        }),
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleArticles),
        TestArticleModel,
        mapping
      );

      const results = [];
      for await (const progress of migrator.boot()) {
        results.push(progress);
      }

      expect(results).toHaveLength(2);
      expect(results.every(r => !r.error)).toBe(true);
      expect(results.every(r => r.currentItem)).toBe(true);
    });
  });

  describe('Async resolver functions', () => {
    it('should handle async resolver functions', async () => {
      const mapping: MigrationConfig<SourceArticle> = {
        author: async data => {
          // Simulate async user lookup/creation
          await new Promise(resolve => setTimeout(resolve, 10));
          return {
            authorId: data.id,
            model: TestUserModel,
          };
        },
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleArticles),
        TestArticleModel,
        mapping
      );

      const results = [];
      for await (const progress of migrator.boot()) {
        results.push(progress);
      }

      expect(results).toHaveLength(2);
      expect(results.every(r => !r.error)).toBe(true);
    });
  });
});
