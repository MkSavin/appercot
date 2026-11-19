module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/test/compatibility/jest.entry.ts'],
  testTimeout: 30_000,
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.tsx?$': [
      '@swc/jest',
      {
        module: { type: 'es6' },
        jsc: { parser: { syntax: 'typescript' }, target: 'es2022' },
      },
    ],
  },
  transformIgnorePatterns: [],
  moduleNameMapper: {
    '^@appercot/chat$': '<rootDir>/../chat/src/index.ts',
    '^@appercot/protocol$': '<rootDir>/../protocol/src/index.ts',
  },
}
