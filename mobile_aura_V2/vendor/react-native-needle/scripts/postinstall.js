'use strict';
/**
 * Fetch the engine archive on install.
 *
 * Best-effort by design: a failed download must not fail `npm install`. If it
 * does not run — offline, a proxy, `--ignore-scripts`, or pnpm's default
 * postinstall blocking — the CMake guard fails the Android build later with an
 * actionable message instead of an undefined-symbol wall.
 *
 * Set NEEDLE_SKIP_DOWNLOAD=1 to opt out (vendored binaries, air-gapped CI).
 */
const { ENGINE } = require('./artifacts');
const { fetchAll } = require('./fetch');

async function main() {
  if (process.env.NEEDLE_SKIP_DOWNLOAD) return;
  console.log('react-native-needle: fetching the Needle 2 engine (Apache-2.0, from Hugging Face)');
  await fetchAll(ENGINE);
  console.log('  Weights are a separate step: npx react-native-needle fetch-model');
}

main().catch((e) => {
  console.warn(
    `\nreact-native-needle: could not fetch the engine — ${e.message}\n` +
      '  The Android build will fail until you run:  npx react-native-needle fetch\n'
  );
  // Deliberately not a non-zero exit: this must not break an otherwise fine install.
});
