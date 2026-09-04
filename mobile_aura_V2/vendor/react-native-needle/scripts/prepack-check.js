'use strict';
/**
 * Last gate before a tarball is cut.
 *
 * Two things can quietly ruin a release here: publishing without the compiled
 * output (the package would resolve to nothing), and publishing *with* the
 * downloaded binaries (34 MB of someone else's artifacts, pinned to whatever
 * happened to be on this machine). Fail loudly on either.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const problems = [];

for (const f of ['build/index.js', 'build/index.d.ts']) {
  if (!fs.existsSync(path.join(ROOT, f))) problems.push(`missing build output: ${f}`);
}

// `files` is an allowlist and it wins over .npmignore, so the exclusions have
// to be negations in there. Without them a tarball cut on a machine that has
// already fetched the binaries balloons from 19 kB to 98 MB.
const { files } = require(path.join(ROOT, 'package.json'));
for (const pattern of ['!android/libs', '!android/src/main/assets/*.cact']) {
  if (!files.includes(pattern)) {
    problems.push(`package.json "files" must contain ${pattern} — upstream binaries are fetched, not shipped`);
  }
}

if (problems.length) {
  console.error('prepack failed:\n' + problems.map((p) => `  ✗ ${p}`).join('\n'));
  process.exit(1);
}
console.log('prepack: build output present, upstream binaries excluded.');
