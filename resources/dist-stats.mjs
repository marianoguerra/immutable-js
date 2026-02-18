import fs from 'node:fs/promises';
import { deflate } from 'zlib';
import 'colors';

const VERIFY_AGAINST_VERSION = '4';

const deflateContent = (content) =>
  new Promise((resolve, reject) =>
    deflate(content, (error, out) => (error ? reject(error) : resolve(out)))
  );

const space = (n, s) =>
  new Array(Math.max(0, 10 + n - (s || '').length)).join(' ') + (s || '');

const bytes = (b) =>
  `${b.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',')} bytes`;

const diff = (n, o) => {
  const d = n - o;
  return d === 0 ? '' : d < 0 ? ` ${bytes(d)}`.green : ` +${bytes(d)}`.red;
};

const percentage = (s, b) => ` ${Math.floor(10000 * (1 - s / b)) / 100}%`.grey;

let bundlephobaInfoCache;

async function bundlephobaInfo(key) {
  if (!bundlephobaInfoCache) {
    try {
      const res = await fetch(
        `https://bundlephobia.com/api/size?package=immutable@${VERIFY_AGAINST_VERSION}`
      );

      if (res.status !== 200) {
        throw new Error(
          `Unable to fetch bundlephobia in dist-stats.mjs. Status code is "${res.status}"`
        );
      }

      bundlephobaInfoCache = await res.json();
    } catch (err) {
      console.error(err.message);

      throw err;
    }
  }

  return bundlephobaInfoCache[key];
}

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
  bundlephobaInfo('gzip'),
]).then(([rawNew, zipNew, rawMin, zipMin, zipOld]) => {
  console.log('\n  immutable.js');
  console.log(`  Raw: ${space(14, bytes(promiseNumberValue(rawNew)).cyan)}`);

  if (zipOld.status === 'fulfilled') {
    console.log(
      `  Zip: ${space(14, bytes(promiseNumberValue(zipNew)).cyan)}${percentage(
        promiseNumberValue(zipNew),
        promiseNumberValue(rawNew)
      )}${space(15, diff(promiseNumberValue(zipNew), promiseNumberValue(zipOld)))}`
    );
  }

  console.log('\n  immutable.min.js');
  console.log(`  Raw: ${space(14, bytes(promiseNumberValue(rawMin)).cyan)}`);
  console.log(
    `  Zip: ${space(14, bytes(promiseNumberValue(zipMin)).cyan)}${percentage(
      promiseNumberValue(zipMin),
      promiseNumberValue(rawMin)
    )}`
  );
});
