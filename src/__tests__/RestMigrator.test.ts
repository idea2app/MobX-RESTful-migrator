import { RestMigrator } from '../RestMigrator';
import { ListModel, MigrationConfig } from '../types';

// Mock ListModel implementations for testing
class TestUserModel implements ListModel {
  indexKey = 'id';
  id?: number;
  name?: string;
  email?: string;
  age?: number;
}

class TestCompanyModel implements ListModel {
  indexKey = 'companyId';
  companyId?: number;
  companyName?: string;
}

// Sample source data
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

describe('RestMigrator', () => {
  async function* createAsyncGenerator<T>(items: T[]): AsyncIterable<T> {
    for (const item of items) {
      yield item;
    }
  }

  const sampleData: SourceUser[] = [
    {
      user_id: 1,
      full_name: 'John Doe',
      email_address: 'john@example.com',
      birth_year: 1990,
      company_info: { id: 100, name: 'Tech Corp' }
    },
    {
      user_id: 2,
      full_name: 'Jane Smith',
      email_address: 'jane@example.com',
      birth_year: 1985,
      company_info: { id: 101, name: 'Design Studio' }
    }
  ];

  describe('Simple 1-to-1 mapping', () => {
    it('should map fields with simple string mappings', async () => {
      const mapping: MigrationConfig<SourceUser> = {
        user_id: 'id',
        email_address: 'email'
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleData),
        TestUserModel,
        mapping
      );

      const results = [];
      for await (const progress of migrator.boot()) {
        results.push(progress);
      }

      expect(results).toHaveLength(2);
      expect(results[0].processed).toBe(1);
      expect(results[1].processed).toBe(2);
      expect(results.every(r => !r.error)).toBe(true);
    });
  });

  describe('1-to-many mapping with resolver', () => {
    it('should handle resolver functions returning multiple fields', async () => {
      const mapping: MigrationConfig<SourceUser> = {
        full_name: (data) => ({
          name: data.full_name,
          email: data.email_address
        })
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleData),
        TestUserModel,
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

  describe('Many-to-1 mapping with resolver', () => {
    it('should handle resolver functions with computed values', async () => {
      const mapping: MigrationConfig<SourceUser> = {
        birth_year: (data) => ({
          age: new Date().getFullYear() - data.birth_year
        })
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleData),
        TestUserModel,
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

  describe('Cross-table relationship mapping', () => {
    it('should handle cross-table mappings with related models', async () => {
      const mapping: MigrationConfig<SourceUser> = {
        company_info: (data) => ({
          companyId: data.company_info.id,
          model: TestCompanyModel
        })
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleData),
        TestUserModel,
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

  describe('Error handling', () => {
    it('should handle errors in mapping functions', async () => {
      const mapping: MigrationConfig<SourceUser> = {
        user_id: () => {
          throw new Error('Mapping error');
        }
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleData),
        TestUserModel,
        mapping
      );

      const results = [];
      for await (const progress of migrator.boot()) {
        results.push(progress);
      }

      expect(results).toHaveLength(2);
      expect(results.every(r => r.error)).toBe(true);
    });

    it('should handle errors in data source', async () => {
      async function* errorGenerator(): AsyncIterable<SourceUser> {
        yield sampleData[0];
        throw new Error('Data source error');
      }

      const mapping: MigrationConfig<SourceUser> = {
        user_id: 'id'
      };

      const migrator = new RestMigrator(
        errorGenerator(),
        TestUserModel,
        mapping
      );

      const results = [];
      for await (const progress of migrator.boot()) {
        results.push(progress);
      }

      expect(results.length).toBeGreaterThan(0);
      expect(results[results.length - 1].error).toBeDefined();
    });
  });

  describe('Mixed mapping types', () => {
    it('should handle all mapping types together', async () => {
      const mapping: MigrationConfig<SourceUser> = {
        user_id: 'id',
        full_name: 'name',
        email_address: 'email',
        birth_year: (data) => ({
          age: new Date().getFullYear() - data.birth_year
        }),
        company_info: (data) => ({
          companyId: data.company_info.id,
          model: TestCompanyModel
        })
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleData),
        TestUserModel,
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
      const mapping: MigrationConfig<SourceUser> = {
        user_id: async (data) => {
          // Simulate async operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return { id: data.user_id };
        }
      };

      const migrator = new RestMigrator(
        createAsyncGenerator(sampleData),
        TestUserModel,
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