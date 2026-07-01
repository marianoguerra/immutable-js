import { execSync } from 'node:child_process';
import { readdir, readFile, writeFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import vm from 'node:vm';
import pc from 'picocolors';
import { Bench } from 'tinybench';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const perfDir = path.resolve(__dirname, '../perf/');
const distPath = path.resolve(__dirname, '../dist/immutable.js');

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

// The dist is ESM, but may come from a git object rather than a file on
// disk, so write it to a temp file to import it.
async function loadDistFromSource(src) {
  const tmpDir = await mkdtemp(path.join(tmpdir(), 'immutable-bench-'));
  const tmpFile = path.join(tmpDir, 'immutable-loaded.mjs');
  await writeFile(tmpFile, src);
  try {
    return await import(pathToFileURL(tmpFile).href);
  } finally {
    await rm(tmpDir, { recursive: true, force: true });
  }
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
  return loadDistFromSource(oldSrc);
}

async function loadDistFromFile(filePath) {
  return loadDistFromSource(await readFile(filePath, 'utf8'));
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

const pad = (n, s) => Array(Math.max(0, 1 + n - s.length)).join(' ') + s;
const fmt = (b) =>
  Math.floor(b)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
const pct = (p) => Math.floor(p * 10000) / 100 + '%';

async function runBenchmarks(tests, labels) {
  for (const test of tests) {
    console.log(pc.bold(test.description));
    process.stdout.write(pc.gray('  ...running...  '));

    const bench = new Bench({ time: 500 });
    test.tests.forEach((run, version) => {
      // The DSL's beforeEach maps to tinybench's per-task beforeAll: the old
      // benchmark.js harness ran it once per cycle (a handful of times per
      // task), while tinybench's beforeEach would run it before every single
      // iteration — thousands of times, dominating tasks with heavy setup.
      // The measured ops never mutate the prepared structures, so
      // once-per-task setup is equivalent.
      bench.add(labels[version] || `v${version}`, run.test, {
        beforeAll: run.before,
      });
    });

    await bench.run();
    process.stdout.write('\r\x1B[K');

    const throughputs = bench.tasks.map((task) => task.result.throughput);

    // Print each version's ops/sec with its margin-of-error bounds
    bench.tasks.forEach((task, i) => {
      const { mean, moe } = throughputs[i];
      console.log(
        pc.gray(pc.bold('  ' + task.name + ': ')) +
          (pad(9, fmt(mean - moe)) +
            ' ' +
            pad(9, fmt(mean)) +
            ' ' +
            pad(9, fmt(mean + moe)) +
            ' ops/sec')
      );
    });

    // Print diffs between the first version and each other version
    for (let i = 1; i < throughputs.length; i++) {
      const diffMean =
        (throughputs[0].mean - throughputs[i].mean) / throughputs[i].mean;

      const sq = (p) => p * p;
      const relativeMoe = (stats) => stats.moe / stats.mean;
      const rme = Math.sqrt(
        (sq(relativeMoe(throughputs[0])) + sq(relativeMoe(throughputs[i]))) / 2
      );

      console.log(
        pc.gray(
          '  ' + bench.tasks[0].name + ' vs ' + bench.tasks[i].name + ': '
        ) +
          'diff: ' +
          pct(diffMean) +
          '  rme: ' +
          pct(rme)
      );
    }
  }
}

async function main() {
  const { baseline, compare } = parseArgs();

  const perfSources = await loadPerfTests();

  let modules;
  let labels;
  let sources;

  if (baseline || compare) {
    // 3-way (or 2-way with explicit paths) mode
    const currentModule = await loadCurrentDist();
    modules = [currentModule];
    labels = ['current'];
    sources = [distPath];

    if (baseline) {
      const baselineModule = await loadDistFromFile(baseline);
      modules.push(baselineModule);
      labels.push('baseline');
      sources.push(baseline);
    }

    if (compare) {
      const compareModule = await loadDistFromFile(compare);
      modules.push(compareModule);
      labels.push('compare');
      sources.push(compare);
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
      sources = [distPath, 'main:dist/immutable.js'];
    } else {
      modules = [currentModule];
      labels = ['current'];
      sources = [distPath];
    }
  }

  const maxLabel = Math.max(...labels.map((l) => l.length));
  console.log(pc.bold('Benchmark sources:'));
  for (let i = 0; i < labels.length; i++) {
    console.log(
      pc.gray('  ' + labels[i].padEnd(maxLabel) + '  ← ') + sources[i]
    );
  }
  console.log();

  const tests = collectTests(modules, perfSources);
  await runBenchmarks(tests, labels);
  console.log('all done');
}

main().catch((error) => {
  console.error('ugh', error.stack);
  process.exitCode = 1;
});
