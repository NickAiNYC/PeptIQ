/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/packages'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@peptiq/types$': '<rootDir>/packages/types/src',
    '^@peptiq/config$': '<rootDir>/packages/config/src',
    '^@peptiq/scoring$': '<rootDir>/packages/scoring/src',
    '^@peptiq/ingestion$': '<rootDir>/packages/ingestion/src',
    '^@peptiq/audit$': '<rootDir>/packages/audit/src',
  },
};
