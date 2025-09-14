import { HTTPClient } from 'koajax';
import { ListModel } from 'mobx-restful';

interface User {
  id: number;
  name: string;
  email?: string;
  age?: number;
}

class TestUserModel extends ListModel<User> {
  indexKey = 'id' as const;
  client = new HTTPClient();
  baseURI = '/api/users';

  async loadPage(pageIndex: number, pageSize: number, filter: any) {
    // Mock implementation for testing
    return {
      pageData: [],
      totalCount: 0,
    };
  }
}

interface Article {
  id: number;
  title: string;
  keywords: string;
  content: string;
  author: string;  
  email: string;
}

class TestArticleModel extends ListModel<Article> {
  indexKey = 'id' as const;
  client = new HTTPClient();
  baseURI = '/api/articles';

  async loadPage(pageIndex: number, pageSize: number, filter: any) {
    // Mock implementation for testing
    return {
      pageData: [],
      totalCount: 0,
    };
  }
}

import { RestMigrator } from '../src/RestMigrator';
import { MigrationConfig } from '../src/types';

// Sample source data representing articles table
interface SourceArticle {
  id: number;
  title: string;
  keywords: string; // comma-separated string to be split into tags array
  content: string;
  author: string;
  email: string;
}

describe('RestMigrator', () => {
  async function* createAsyncGenerator<T>(items: T[]): AsyncIterable<T> {
    for (const item of items) {
      yield item;
    }
  }

  const sampleArticles: SourceArticle[] = [
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
      content: 'MobX is a battle tested library that makes state management simple...',
      author: 'Jane Smith', 
      email: 'jane@example.com'
    }
  ];

  describe('Simple 1-to-1 mapping', () => {
    it('should map fields with simple string mappings', async () => {
      const mapping: MigrationConfig<SourceArticle> = {
        id: 'id',
        title: 'title',
        content: 'content'
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

  describe('Keywords to tags array mapping', () => {
    it('should split keywords string into tags array', async () => {
      const mapping: MigrationConfig<SourceArticle> = {
        keywords: (data) => ({
          tags: data.keywords.split(',').map(tag => tag.trim())
        })
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
        author: (data) => ({
          name: data.author,
          email: data.email,
          model: TestUserModel
        })
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
        keywords: (data) => ({
          tags: data.keywords.split(',').map(tag => tag.trim())
        }),
        author: (data) => ({
          authorId: 1, // In real scenario, would lookup/create user
          model: TestUserModel
        })
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
        author: async (data) => {
          // Simulate async user lookup/creation
          await new Promise(resolve => setTimeout(resolve, 10));
          return { 
            authorId: data.id,
            model: TestUserModel 
          };
        }
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