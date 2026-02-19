import path from 'path';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';

const copyright =
  '// @license MIT Copyright (c) 2014-present, Lee Byron and other contributors.';

const SRC_DIR = path.resolve('src');
const DIST_DIR = path.resolve('dist');

export default [
  {
    input: path.join(SRC_DIR, 'Immutable.js'),
    plugins: [
      resolve({
        extensions: ['.ts', '.tsx', '.js', '.jsx'],
      }),
      json(),
      typescript({
        tsconfig: './tsconfig.build.json',
        include: ['src/**/*.ts'],
        removeComments: true,
      }),
    ],
    output: [
      {
        file: path.join(DIST_DIR, 'immutable.js'),
        format: 'es',
        sourcemap: false,
        plugins: [
          terser({
            compress: false,
            mangle: false,
            format: {
              comments: false,
              preamble: copyright,
              beautify: true,
              indent_level: 2,
            },
          }),
        ],
      },
      {
        file: path.join(DIST_DIR, 'immutable.min.js'),
        format: 'es',
        sourcemap: false,
        plugins: [
          terser({
            format: {
              preamble: copyright,
            },
          }),
        ],
      },
    ],
  },
];
