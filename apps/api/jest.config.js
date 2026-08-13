module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testTimeout: 60000,
  testPathIgnorePatterns: ['/node_modules/', '/dist/'],
  transformIgnorePatterns: [
    '/node_modules/(?!(uuid)/)',
  ],
  moduleNameMapper: {
    '^@saas/database$': '<rootDir>/../../packages/database/index.ts',
  },
  transform: {
    // Only transform TypeScript files — exclude .js so ts-jest doesn't complain about allowJs
    '^.+\\.tsx?$': ['ts-jest', {
      tsconfig: {
        esModuleInterop: true,
        allowJs: false,
        strict: false,
      },
      diagnostics: {
        // Suppress warnings about .js files from generated prisma client and TS18047
        ignoreCodes: [151001, 151002, 'TS18047'],
      },
    }],
  },
};
