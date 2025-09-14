"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompanyModel = exports.UserModel = void 0;
exports.runExamples = runExamples;
exports.simpleMigrationExample = simpleMigrationExample;
exports.complexMigrationExample = complexMigrationExample;
exports.errorHandlingExample = errorHandlingExample;
exports.createSampleDataSource = createSampleDataSource;
const src_1 = require("../src");
// Example models
class UserModel {
    constructor() {
        this.indexKey = 'id';
    }
}
exports.UserModel = UserModel;
class CompanyModel {
    constructor() {
        this.indexKey = 'companyId';
    }
}
exports.CompanyModel = CompanyModel;
// Sample data source
async function* createSampleDataSource() {
    const users = [
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
    const migrator = new src_1.RestMigrator(createSampleDataSource(), UserModel, simpleMapping);
    for await (const progress of migrator.boot()) {
        if (progress.error) {
            console.error(`❌ Error processing item ${progress.processed}:`, progress.error.message);
        }
        else {
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
        full_name: (data) => ({
            name: data.full_name.toUpperCase()
        }),
        // Many-to-1 computed mapping
        birth_year: (data) => ({
            age: new Date().getFullYear() - data.birth_year
        }),
        // Cross-table relationship
        company_info: (data) => ({
            companyId: data.company_info.id,
            model: CompanyModel
        })
    };
    const migrator = new src_1.RestMigrator(createSampleDataSource(), UserModel, complexMapping);
    for await (const progress of migrator.boot()) {
        if (progress.error) {
            console.error(`❌ Error processing item ${progress.processed}:`, progress.error.message);
            console.error(`   Item data:`, JSON.stringify(progress.currentItem, null, 2));
        }
        else {
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
        full_name: (data) => {
            // Intentionally throw error for certain items
            if (data.user_id === 2) {
                throw new Error('Simulated mapping error');
            }
            return { name: data.full_name };
        },
        email_address: 'email'
    };
    const migrator = new src_1.RestMigrator(createSampleDataSource(), UserModel, errorMapping);
    let successCount = 0;
    let errorCount = 0;
    for await (const progress of migrator.boot()) {
        if (progress.error) {
            errorCount++;
            console.error(`❌ Error processing item ${progress.processed}:`, progress.error.message);
        }
        else {
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
    }
    catch (error) {
        console.error('❌ Example execution failed:', error);
    }
}
// Run examples if this file is executed directly
if (require.main === module) {
    runExamples();
}
//# sourceMappingURL=basic-usage.js.map