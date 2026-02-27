/** @type {import('jest').Config} */
const config = {
  moduleFileExtensions: ['js', 'ts'],
  resolver: '<rootDir>/resources/jestResolver.cjs',
  testRegex: ['/__tests__/.*\\.(ts|js)$', '/website/.*\\.test\\.(ts|js)$'],
  testPathIgnorePatterns: ['/__tests__/ts-utils.ts'],
  extensionsToTreatAsEsm: ['.ts'],
  transform: {
    '^.+\\.[tj]s$': ['ts-jest', { useESM: true, diagnostics: false }],
  },
};

export default config;
