import path from 'path';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';
import typescript from '@rollup/plugin-typescript';
import copyright from './copyright.mjs';

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
      }),
    ],
    output: [
      {
        banner: copyright,
        file: path.join(DIST_DIR, 'immutable.js'),
        format: 'es',
        sourcemap: false,
      },
      {
        banner: copyright,
        file: path.join(DIST_DIR, 'immutable.min.js'),
        format: 'es',
        sourcemap: false,
        plugins: [terser()],
      },
    ],
  },
];
