/* global process */
/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'ts'],
  moduleNameMapper: {
    '^immutable$': process.env.CI
      ? '<rootDir>/dist/immutable.js'
      : '<rootDir>/src/Immutable.js',
  },
  testRegex: ['/__tests__/.*\\.(ts|js)$', '/website/.*\\.test\\.(ts|js)$'],
  testPathIgnorePatterns: ['/__tests__/ts-utils.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { useESM: true, diagnostics: false }],
  },
};

export default config;
