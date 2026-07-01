import fs from 'node:fs/promises';
import { deflate } from 'zlib';
import pc from 'picocolors';

const deflateContent = (content) =>
  new Promise((resolve, reject) =>
    deflate(content, (error, out) => (error ? reject(error) : resolve(out)))
  );

const space = (n, s) =>
  new Array(Math.max(0, 10 + n - (s || '').length)).join(' ') + (s || '');

const bytes = (b) =>
  `${b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} bytes`;

const percentage = (s, b) =>
  pc.gray(` ${Math.floor(10000 * (1 - s / b)) / 100}%`);

/**
 *
 * @param {PromiseFulfilledResult} promise
 */
function promiseNumberValue(promise) {
  if (!promise || !promise.value) {
    return null;
  }

  const value = promise.value;

  return value === null || typeof value === 'number'
    ? value
    : Number(Buffer.byteLength(value, 'utf8'));
}

Promise.allSettled([
  fs.readFile('dist/immutable.js'),
  fs.readFile('dist/immutable.js').then(deflateContent),
  fs.readFile('dist/immutable.min.js'),
  fs.readFile('dist/immutable.min.js').then(deflateContent),
]).then(([rawNew, zipNew, rawMin, zipMin]) => {
  console.log('\n  immutable.js');
  console.log(
    `  Raw: ${space(14, pc.cyan(bytes(promiseNumberValue(rawNew))))}`
  );
  console.log(
    `  Zip: ${space(14, pc.cyan(bytes(promiseNumberValue(zipNew))))}${percentage(
      promiseNumberValue(zipNew),
      promiseNumberValue(rawNew)
    )}`
  );

  console.log('\n  immutable.min.js');
  console.log(
    `  Raw: ${space(14, pc.cyan(bytes(promiseNumberValue(rawMin))))}`
  );
  console.log(
    `  Zip: ${space(14, pc.cyan(bytes(promiseNumberValue(zipMin))))}${percentage(
      promiseNumberValue(zipMin),
      promiseNumberValue(rawMin)
    )}`
  );
});
