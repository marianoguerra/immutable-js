import { getVersions } from './src/static/getVersions.js';

/** @type {import('next-sitemap').IConfig} */
export default {
  siteUrl: 'https://immutable-js.com',
  generateRobotsTxt: true,
  outDir: './out',
  exclude: [
    '/docs',
    ...getVersions()
      .slice(1)
      .map((version) => `/docs/${version}/*`),
  ],
};
