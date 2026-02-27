import fs from 'node:fs';

// Create empty npm directory
fs.rmSync('npm', { recursive: true, force: true });
fs.mkdirSync('npm', { recursive: true });

// Copy over necessary files
fs.cpSync('dist', 'npm/dist', { recursive: true });
fs.copyFileSync('README.md', 'npm/README.md');
fs.copyFileSync('LICENSE', 'npm/LICENSE');

// Ensure a vanilla package.json before deploying so other tools do not interpret
// the built output as requiring any further transformation.
const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const filtered = Object.fromEntries(
  Object.entries(pkg).filter(([key]) => pkg.publishKeys.includes(key))
);
fs.writeFileSync('./npm/package.json', JSON.stringify(filtered, null, 2));
