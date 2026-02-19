import { execSync } from 'child_process';

let versions;
let versionsFromGitTag;

/** @returns {Array<string>} */
function getVersions() {
  if (!versions) {
    // VERSION does not work in sitemap generation
    versions = ['v7'].concat(getVersionFromGitTag());
  }
  return versions;
}

/** @returns {Array<string>} */
function getVersionFromGitTag() {
  if (versionsFromGitTag) {
    return versionsFromGitTag;
  }

  let versions = [];
  const tags = execSync('git tag -l --sort=-creatordate', {
    encoding: 'utf8',
  }).split('\n');
  // const latestV5Tag = tags.find((t) => t.match(/^v?5/));
  const latestV4Tag = tags.find((t) => t.match(/^v?4/));
  const latestV3Tag = tags.find((t) => t.match(/^v?3/));

  if (latestV4Tag) {
    versions.push(latestV4Tag);
  }
  if (latestV3Tag) {
    versions.push(latestV3Tag);
  }

  versionsFromGitTag = versions;

  return versions;
}

export { getVersions, getVersionFromGitTag };
