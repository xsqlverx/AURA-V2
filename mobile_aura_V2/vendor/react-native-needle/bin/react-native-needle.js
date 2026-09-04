#!/usr/bin/env node
'use strict';
/**
 * `npx react-native-needle <command>`
 *
 * The engine archive is fetched automatically on install; the weights are not,
 * because 14 MB of weights should be a deliberate choice — plenty of callers
 * will want to ship a fine-tune instead of the stock model.
 */
const fs = require('fs');
const path = require('path');
const { ENGINE, MODEL } = require('../scripts/artifacts');
const { fetchAll, isSatisfied, sha256, human } = require('../scripts/fetch');

const COMMANDS = `
Usage: npx react-native-needle <command>

  fetch                 Engine + stock weights (everything needed to run)
  fetch-engine          Engine only — required to compile
  fetch-model [source]  Stock weights, or install your own .cact from a local
                        path (that is how you ship a fine-tune)
  doctor                Report what is present and whether it is intact
`;

/** Install a caller-supplied .cact — the seam a fine-tuned model slots into. */
function installLocalModel(source) {
  const from = path.resolve(source);
  if (!fs.existsSync(from)) throw new Error(`No such file: ${from}`);
  fs.mkdirSync(path.dirname(MODEL.dest), { recursive: true });
  fs.copyFileSync(from, MODEL.dest);
  console.log(`  ✓ installed ${path.basename(from)} (${human(fs.statSync(MODEL.dest).size)})`);
  console.log('    Rebuild the Android app to pick it up.');
}

async function doctor() {
  let ok = true;
  for (const artifact of [...ENGINE, MODEL]) {
    const present = fs.existsSync(artifact.dest);
    const intact = present && (await isSatisfied(artifact));
    // A model that is present but off-checksum is a fine-tune, not damage.
    const customModel = present && !intact && artifact === MODEL;
    const label = intact
      ? 'ok'
      : customModel
        ? `present, not the stock model (sha ${(await sha256(artifact.dest)).slice(0, 12)}…)`
        : present
          ? 'CORRUPT — re-run `npx react-native-needle fetch-engine`'
          : 'missing';
    const fine = intact || customModel;
    if (!fine) ok = false;
    console.log(`  ${fine ? '✓' : '✗'} ${artifact.name.padEnd(24)} ${label}`);
  }
  console.log(ok ? '\nReady to build.' : '\nRun `npx react-native-needle fetch` first.');
  return ok;
}

async function main() {
  const [command, arg] = process.argv.slice(2);
  switch (command) {
    case 'fetch':
      await fetchAll([...ENGINE, MODEL]);
      break;
    case 'fetch-engine':
      await fetchAll(ENGINE);
      break;
    case 'fetch-model':
      if (arg) installLocalModel(arg);
      else await fetchAll([MODEL]);
      break;
    case 'doctor':
      process.exitCode = (await doctor()) ? 0 : 1;
      return;
    default:
      console.log(COMMANDS.trim());
      process.exitCode = command ? 1 : 0;
      return;
  }
}

main().catch((e) => {
  console.error(`react-native-needle: ${e.message}`);
  process.exitCode = 1;
});
