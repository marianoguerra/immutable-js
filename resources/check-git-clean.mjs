import { execSync } from 'node:child_process';

const diff = execSync('git diff', { encoding: 'utf8' });

if (diff) {
  console.error(`
\x1b[31mThe CI build resulted in additional changed files.
Typically this is due to not running \x1b[4mnpm test\x1b[24m locally before
submitting a pull request.

The following changes were found:\x1b[0m
`);
  console.error(diff);
  process.exit(1);
}
