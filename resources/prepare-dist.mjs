import fs from 'node:fs';

const pkg = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
const filtered = Object.fromEntries(
  Object.entries(pkg).filter(([key]) => pkg.publishKeys.includes(key))
);
fs.writeFileSync('./npm/package.json', JSON.stringify(filtered, null, 2));
