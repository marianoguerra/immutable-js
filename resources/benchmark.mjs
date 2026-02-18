import { execSync } from 'node:child_process';
import { readdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';
import 'colors';

const require = createRequire(import.meta.url);
const Benchmark = require('benchmark');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const perfDir = path.resolve(__dirname, '../perf/');
const distPath = path.resolve(__dirname, '../dist/immutable.js');

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

  // Write old source to a temp file so we can import() it as ESM
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'immutable-bench-'));
  const tmpFile = path.join(tmpDir, 'immutable-old.mjs');
  await writeFile(tmpFile, oldSrc);
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

function runBenchmarks(tests) {
  const suites = [];

  tests.forEach((test) => {
    const suite = new Benchmark.Suite(test.description, {
      onStart(event) {
        console.log(event.currentTarget.name.bold);
        process.stdout.write('  ...running...  '.gray);
      },
      onComplete(event) {
        process.stdout.write('\r\x1B[K');
        const stats = Array.prototype.map.call(
          event.currentTarget,
          (target) => target.stats
        );

        const pad = (n, s) =>
          Array(Math.max(0, 1 + n - s.length)).join(' ') + s;
        const fmt = (b) =>
          Math.floor(b)
            .toString()
            .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        const pct = (p) => Math.floor(p * 10000) / 100 + '%';

        const dualRuns = stats.length === 2;

        if (dualRuns) {
          const prevMean = 1 / stats[1].mean;
          const prevLowmoe = 1 / (stats[1].mean + stats[1].moe);
          const prevHighmoe = 1 / (stats[1].mean - stats[1].moe);

          console.log(
            '  Old: '.bold.gray +
              (pad(9, fmt(prevLowmoe)) +
                ' ' +
                pad(9, fmt(prevMean)) +
                ' ' +
                pad(9, fmt(prevHighmoe)) +
                ' ops/sec')
          );
        }

        const mean = 1 / stats[0].mean;
        const lowmoe = 1 / (stats[0].mean + stats[0].moe);
        const highmoe = 1 / (stats[0].mean - stats[0].moe);

        console.log(
          (dualRuns ? '  New: '.bold.gray : '  ') +
            (pad(9, fmt(lowmoe)) +
              ' ' +
              pad(9, fmt(mean)) +
              ' ' +
              pad(9, fmt(highmoe)) +
              ' ops/sec')
        );

        if (dualRuns) {
          const prevMean = 1 / stats[1].mean;
          const diffMean = (mean - prevMean) / prevMean;

          const comparison = event.currentTarget[1].compare(
            event.currentTarget[0]
          );
          const comparison2 = event.currentTarget[0].compare(
            event.currentTarget[1]
          );
          console.log('  compare: ' + comparison + ' ' + comparison2);
          console.log('  diff: ' + pct(diffMean));

          const sq = (p) => p * p;
          const rme = Math.sqrt(
            (sq(stats[0].rme / 100) + sq(stats[1].rme / 100)) / 2
          );
          console.log('  rme: ' + pct(rme));
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
  const [currentModule, mainModule, perfSources] = await Promise.all([
    loadCurrentDist(),
    loadMainDist(),
    loadPerfTests(),
  ]);

  const modules =
    mainModule && currentModule !== mainModule
      ? [currentModule, mainModule]
      : [currentModule];

  const tests = collectTests(modules, perfSources);
  await runBenchmarks(tests);
  console.log('all done');
}

main().catch((error) => {
  console.error('ugh', error.stack);
  process.exitCode = 1;
});
