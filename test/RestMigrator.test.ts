import { RestMigrator } from '../src/RestMigrator';
import { MigrationConfig } from '../src/types';

import { createSourceStream, sampleArticles, SourceArticle } from './example/source';
import { ArticleModel, UserModel, Article } from './example/target';

describe('RestMigrator', () => {
  describe('Simple 1-to-1 mapping', () => {
    it('should map fields with simple string mappings', async () => {
      const mapping: MigrationConfig<SourceArticle, Article> = {
        id: 'id',
        title: 'title',
        content: 'content',
      };

      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);
      
      const results = [];
      for await (const result of migrator.boot()) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id', sampleArticles[0].id);
      expect(results[0]).toHaveProperty('title', sampleArticles[0].title);
      expect(results[0]).toHaveProperty('content', sampleArticles[0].content);
    });
  });

  describe('Keywords to tags array mapping', () => {
    it('should split keywords string into tags array', async () => {
      const mapping: MigrationConfig<SourceArticle, Article> = {
        id: 'id',
        title: 'title',
        content: 'content',
        keywords: data => ({
          tags: { value: data.keywords.split(',').map(tag => tag.trim()) }
        }),
      };

      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);
      
      const results = [];
      for await (const result of migrator.boot()) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('tags');
      expect(results[0].tags).toEqual(['typescript', 'javascript', 'programming']);
      expect(results[1].tags).toEqual(['mobx', 'react', 'state-management']);
    });
  });

  describe('Author/Email to User table mapping', () => {
    it('should map author and email to User model', async () => {
      const mapping: MigrationConfig<SourceArticle, Article> = {
        id: 'id',
        title: 'title',
        content: 'content',
        author: data => ({
          author: {
            value: { name: data.author, email: data.email },
            model: UserModel
          }
        }),
      };

      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);
      
      const results = [];
      for await (const result of migrator.boot()) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('author');
      expect(results[1]).toHaveProperty('author');
    });
  });

  describe('Complete Article migration', () => {
    it('should handle complete article to target tables migration', async () => {
      const mapping: MigrationConfig<SourceArticle, Article> = {
        id: 'id',
        title: 'title',
        content: 'content',
        keywords: data => ({
          tags: { value: data.keywords.split(',').map(tag => tag.trim()) }
        }),
        author: data => ({
          author: {
            value: { name: data.author, email: data.email },
            model: UserModel
          }
        }),
      };

      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);
      
      const results = [];
      for await (const result of migrator.boot()) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('id', sampleArticles[0].id);
      expect(results[0]).toHaveProperty('title', sampleArticles[0].title);
      expect(results[0]).toHaveProperty('tags');
      expect(results[0]).toHaveProperty('author');
    });
  });

  describe('Async resolver functions', () => {
    it('should handle async resolver functions', async () => {
      const mapping: MigrationConfig<SourceArticle, Article> = {
        id: 'id',
        title: 'title',
        author: async data => {
          // Simulate async user lookup/creation
          await new Promise(resolve => setTimeout(resolve, 10));
          return {
            author: {
              value: { name: data.author, email: data.email },
              model: UserModel
            }
          };
        },
      };

      const migrator = new RestMigrator(createSourceStream, ArticleModel, mapping);
      
      const results = [];
      for await (const result of migrator.boot()) {
        results.push(result);
      }

      expect(results).toHaveLength(2);
      expect(results[0]).toHaveProperty('author');
      expect(results[1]).toHaveProperty('author');
    });
  });
});
