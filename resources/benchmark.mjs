import { execSync } from 'node:child_process';
import { readdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';
import pc from 'picocolors';

const require = createRequire(import.meta.url);
const Benchmark = require('benchmark');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const perfDir = path.resolve(__dirname, '../perf/');
const distPath = path.resolve(__dirname, '../dist/immutable.js');

function isUMDSource(src) {
  // Strip leading whitespace, line comments, and block comments before checking
  const stripped = src.replace(/^(\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)+/, '');
  return stripped.startsWith('(function') || stripped.startsWith('!function');
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { baseline: null, compare: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--baseline' && args[i + 1]) {
      result.baseline = args[++i];
    } else if (args[i] === '--compare' && args[i + 1]) {
      result.compare = args[++i];
    }
  }
  return result;
}

async function loadCurrentDist() {
  return import(pathToFileURL(distPath).href);
}

async function loadMainDist() {
  let oldSrc;
  try {
    oldSrc = execSync('git show main:dist/immutable.js', {
      encoding: 'utf8',
    });
  } catch {
    return null;
  }

  const isUMD = isUMDSource(oldSrc);

  if (isUMD) {
    // Wrap UMD in ESM: execute in a vm context and re-export
    const tmpDir = await mkdtemp(path.join(tmpdir(), 'immutable-bench-'));
    const tmpFile = path.join(tmpDir, 'immutable-old.mjs');
    const wrapped = `
var module = { exports: {} };
var exports = module.exports;
var define = undefined;
${oldSrc}
export default module.exports;
export const List = module.exports.List;
export const Map = module.exports.Map;
export const OrderedMap = module.exports.OrderedMap;
export const Set = module.exports.Set;
export const OrderedSet = module.exports.OrderedSet;
export const Stack = module.exports.Stack;
export const Range = module.exports.Range;
export const Repeat = module.exports.Repeat;
export const Record = module.exports.Record;
export const Seq = module.exports.Seq;
export const Collection = module.exports.Collection;
export const is = module.exports.is;
export const fromJS = module.exports.fromJS;
export const hash = module.exports.hash;
`;
    await writeFile(tmpFile, wrapped);
    try {
      return await import(pathToFileURL(tmpFile).href);
    } finally {
      await rm(tmpDir, { recursive: true, force: true });
    }
  }

  // ESM source: write to temp file and import
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'immutable-bench-'));
  const tmpFile = path.join(tmpDir, 'immutable-old.mjs');
  await writeFile(tmpFile, oldSrc);
  try {
    return await import(pathToFileURL(tmpFile).href);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function loadDistFromFile(filePath) {
  const src = await readFile(filePath, 'utf8');

  const isUMD = isUMDSource(src);

  const tmpDir = await mkdtemp(path.join(tmpdir(), 'immutable-bench-'));
  const tmpFile = path.join(tmpDir, 'immutable-loaded.mjs');

  if (isUMD) {
    const wrapped = `
var module = { exports: {} };
var exports = module.exports;
var define = undefined;
${src}
export default module.exports;
export const List = module.exports.List;
export const Map = module.exports.Map;
export const OrderedMap = module.exports.OrderedMap;
export const Set = module.exports.Set;
export const OrderedSet = module.exports.OrderedSet;
export const Stack = module.exports.Stack;
export const Range = module.exports.Range;
export const Repeat = module.exports.Repeat;
export const Record = module.exports.Record;
export const Seq = module.exports.Seq;
export const Collection = module.exports.Collection;
export const is = module.exports.is;
export const fromJS = module.exports.fromJS;
export const hash = module.exports.hash;
`;
    await writeFile(tmpFile, wrapped);
  } else {
    await writeFile(tmpFile, src);
  }

  try {
    return await import(pathToFileURL(tmpFile).href);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
}

async function loadPerfTests() {
  const filenames = await readdir(perfDir);
  return Promise.all(
    filenames.map(async (filename) => ({
      path: filename,
      source: await readFile(path.resolve(perfDir, filename), 'utf8'),
    }))
  );
}

function collectTests(modules, perfSources) {
  const tests = {};

  modules.forEach((Immutable, version) => {
    perfSources.forEach((source) => {
      const description = [];
      const beforeStack = [];
      let beforeFn;
      let prevBeforeFn;

      function describe(name, fn) {
        description.push(name);
        beforeStack.push(prevBeforeFn);
        prevBeforeFn = beforeFn;
        fn();
        beforeFn = prevBeforeFn;
        prevBeforeFn = beforeStack.pop();
        description.pop();
      }

      function beforeEach(fn) {
        beforeFn = !prevBeforeFn
          ? fn
          : ((prev) => () => {
              prev();
              fn();
            })(prevBeforeFn);
      }

      function it(name, test) {
        const fullName = description.join(' > ') + ' ' + name;
        (
          tests[fullName] ||
          (tests[fullName] = {
            description: fullName,
            tests: [],
          })
        ).tests[version] = {
          before: beforeFn,
          test: test,
        };
      }

      vm.runInNewContext(
        source.source,
        {
          describe,
          it,
          beforeEach,
          console,
          Immutable,
        },
        source.path
      );
    });
  });

  return Object.keys(tests).map((key) => tests[key]);
}

function runBenchmarks(tests, labels) {
  const suites = [];

  tests.forEach((test) => {
    const suite = new Benchmark.Suite(test.description, {
      onStart(event) {
        console.log(pc.bold(event.currentTarget.name));
        process.stdout.write(pc.gray('  ...running...  '));
      },
      onComplete(event) {
        process.stdout.write('\r\x1B[K');
        const targets = Array.prototype.slice.call(event.currentTarget);
        const stats = targets.map((target) => target.stats);

        const pad = (n, s) =>
          Array(Math.max(0, 1 + n - s.length)).join(' ') + s;
        const fmt = (b) =>
          Math.floor(b)
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const pct = (p) => Math.floor(p * 10000) / 100 + '%';

        const numVersions = stats.length;

        // Print each version's stats
        for (let i = 0; i < numVersions; i++) {
          const mean = 1 / stats[i].mean;
          const lowmoe = 1 / (stats[i].mean + stats[i].moe);
          const highmoe = 1 / (stats[i].mean - stats[i].moe);
          const label = labels[i] || `v${i}`;

          console.log(
            pc.gray(pc.bold('  ' + label + ': ')) +
              (pad(9, fmt(lowmoe)) +
                ' ' +
                pad(9, fmt(mean)) +
                ' ' +
                pad(9, fmt(highmoe)) +
                ' ops/sec')
          );
        }

        // Print diffs between consecutive pairs
        for (let i = 1; i < numVersions; i++) {
          const prevMean = 1 / stats[i].mean;
          const curMean = 1 / stats[0].mean;
          const diffMean = (curMean - prevMean) / prevMean;

          const sq = (p) => p * p;
          const rme = Math.sqrt(
            (sq(stats[0].rme / 100) + sq(stats[i].rme / 100)) / 2
          );

          console.log(
            pc.gray('  ' + labels[0] + ' vs ' + labels[i] + ': ') +
              'diff: ' +
              pct(diffMean) +
              '  rme: ' +
              pct(rme)
          );
        }
      },
    });

    test.tests.forEach((run) => {
      suite.add({
        fn: run.test,
        onStart: run.before,
        onCycle: run.before,
      });
    });

    suites.push(suite);
  });

  return new Promise((resolve) => {
    Benchmark.invoke(suites, 'run', { onComplete: resolve });
  });
}

async function main() {
  const { baseline, compare } = parseArgs();

  const perfSources = await loadPerfTests();

  let modules;
  let labels;

  if (baseline || compare) {
    // 3-way (or 2-way with explicit paths) mode
    const currentModule = await loadCurrentDist();
    modules = [currentModule];
    labels = ['current'];

    if (baseline) {
      const baselineModule = await loadDistFromFile(baseline);
      modules.push(baselineModule);
      labels.push('baseline');
    }

    if (compare) {
      const compareModule = await loadDistFromFile(compare);
      modules.push(compareModule);
      labels.push('compare');
    }
  } else {
    // Default 2-way: current vs main
    const [currentModule, mainModule] = await Promise.all([
      loadCurrentDist(),
      loadMainDist(),
    ]);

    if (mainModule && currentModule !== mainModule) {
      modules = [currentModule, mainModule];
      labels = ['current', 'main'];
    } else {
      modules = [currentModule];
      labels = ['current'];
    }
  }

  const tests = collectTests(modules, perfSources);
  await runBenchmarks(tests, labels);
  console.log('all done');
}

main().catch((error) => {
  console.error('ugh', error.stack);
  process.exitCode = 1;
});
