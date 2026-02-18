/**
 * @param {import("@babel/core").ConfigAPI} api
 *
 * Babel is only used for Jest. The production build uses TypeScript via Rollup.
 */
// eslint-disable-next-line no-undef
module.exports = function (api) {
  // eslint-disable-next-line no-undef
  api.cache(() => process.env.NODE_ENV);

  const presets = [
    [
      '@babel/env',
      {
        targets: { node: 'current' },
      },
    ],
    ['@babel/preset-typescript', { allowDeclareFields: true }],
  ];

  return {
    assumptions: {
      noClassCalls: true,
      superIsCallableConstructor: true,
    },
    presets,
  };
};
