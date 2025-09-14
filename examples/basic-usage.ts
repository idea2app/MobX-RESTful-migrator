import { RestMigrator } from '../src';

// Example models
class UserModel {
  indexKey = 'id';
  id?: number;
  name?: string;
  email?: string;
  age?: number;
  companyId?: number;
}

class CompanyModel {
  indexKey = 'companyId';
  companyId?: number;
  name?: string;
}

// Source data interface
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

// Sample data source
async function* createSampleDataSource(): AsyncGenerator<SourceUser> {
  const users: SourceUser[] = [
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
    },
    {
      user_id: 3,
      full_name: 'Bob Johnson',
      email_address: 'bob@example.com',
      birth_year: 1988,
      company_info: { id: 100, name: 'Tech Corp' }
    }
  ];

  for (const user of users) {
    // Simulate async data fetching
    await new Promise(resolve => setTimeout(resolve, 100));
    yield user;
  }
}

// Example 1: Simple migration
async function simpleMigrationExample() {
  console.log('\n=== Simple Migration Example ===');
  
  const simpleMapping = {
    user_id: 'id',
    full_name: 'name',
    email_address: 'email'
  };

  const migrator = new RestMigrator(
    createSampleDataSource(),
    UserModel,
    simpleMapping
  );

  for await (const progress of migrator.boot()) {
    if (progress.error) {
      console.error(`❌ Error processing item ${progress.processed}:`, progress.error.message);
    } else {
      console.log(`✅ Processed item ${progress.processed}: ${progress.currentItem?.full_name}`);
    }
  }
}

// Example 2: Complex migration with all mapping types
async function complexMigrationExample() {
  console.log('\n=== Complex Migration Example ===');
  
  const complexMapping = {
    // Simple 1-to-1 mappings
    user_id: 'id',
    email_address: 'email',
    
    // 1-to-many mapping with transformation
    full_name: (data: SourceUser) => ({
      name: data.full_name.toUpperCase()
    }),
    
    // Many-to-1 computed mapping
    birth_year: (data: SourceUser) => ({
      age: new Date().getFullYear() - data.birth_year
    }),
    
    // Cross-table relationship
    company_info: (data: SourceUser) => ({
      companyId: data.company_info.id,
      model: CompanyModel
    })
  };

  const migrator = new RestMigrator(
    createSampleDataSource(),
    UserModel,
    complexMapping
  );

  for await (const progress of migrator.boot()) {
    if (progress.error) {
      console.error(`❌ Error processing item ${progress.processed}:`, progress.error.message);
      console.error(`   Item data:`, JSON.stringify(progress.currentItem, null, 2));
    } else {
      console.log(`✅ Successfully processed item ${progress.processed}`);
      console.log(`   Name: ${progress.currentItem?.full_name}`);
      console.log(`   Email: ${progress.currentItem?.email_address}`);
      console.log(`   Company: ${progress.currentItem?.company_info?.name}`);
    }
  }
}

// Example 3: Error handling
async function errorHandlingExample() {
  console.log('\n=== Error Handling Example ===');
  
  // Mapping with intentional error
  const errorMapping = {
    user_id: 'id',
    full_name: (data: SourceUser) => {
      // Intentionally throw error for certain items
      if (data.user_id === 2) {
        throw new Error('Simulated mapping error');
      }
      return { name: data.full_name };
    },
    email_address: 'email'
  };

  const migrator = new RestMigrator(
    createSampleDataSource(),
    UserModel,
    errorMapping
  );

  let successCount = 0;
  let errorCount = 0;

  for await (const progress of migrator.boot()) {
    if (progress.error) {
      errorCount++;
      console.error(`❌ Error processing item ${progress.processed}:`, progress.error.message);
    } else {
      successCount++;
      console.log(`✅ Successfully processed item ${progress.processed}: ${progress.currentItem?.full_name}`);
    }
  }

  console.log(`\nSummary: ${successCount} successful, ${errorCount} failed`);
}

// Run all examples
async function runExamples() {
  console.log('🚀 MobX-RESTful-migrator Examples');
  
  try {
    await simpleMigrationExample();
    await complexMigrationExample();
    await errorHandlingExample();
    
    console.log('\n✨ All examples completed!');
  } catch (error) {
    console.error('❌ Example execution failed:', error);
  }
}

// Export for usage
export {
  runExamples,
  simpleMigrationExample,
  complexMigrationExample,
  errorHandlingExample,
  UserModel,
  CompanyModel,
  createSampleDataSource
};

// Run examples if this file is executed directly
if (require.main === module) {
  runExamples();
}