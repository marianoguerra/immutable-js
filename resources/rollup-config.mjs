import path from 'path';
import json from '@rollup/plugin-json';
import resolve from '@rollup/plugin-node-resolve';
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
      typescript({ tsconfig: './tsconfig.build.json' }),
    ],
    output: [
      {
        banner: copyright,
        file: path.join(DIST_DIR, 'immutable.mjs'),
        format: 'es',
        sourcemap: false,
      },
    ],
  },
];
