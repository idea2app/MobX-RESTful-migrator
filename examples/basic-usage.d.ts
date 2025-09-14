declare class UserModel {
    indexKey: string;
    id?: number;
    name?: string;
    email?: string;
    age?: number;
    companyId?: number;
}
declare class CompanyModel {
    indexKey: string;
    companyId?: number;
    name?: string;
}
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
declare function createSampleDataSource(): AsyncGenerator<SourceUser>;
declare function simpleMigrationExample(): Promise<void>;
declare function complexMigrationExample(): Promise<void>;
declare function errorHandlingExample(): Promise<void>;
declare function runExamples(): Promise<void>;
export { runExamples, simpleMigrationExample, complexMigrationExample, errorHandlingExample, UserModel, CompanyModel, createSampleDataSource };
//# sourceMappingURL=basic-usage.d.ts.map