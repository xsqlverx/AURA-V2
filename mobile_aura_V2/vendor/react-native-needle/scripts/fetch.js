'use strict';
/**
 * Download and verify the upstream Needle artifacts.
 *
 * Downloads land in a sibling `.part` file and are renamed only after the
 * checksum matches, so an interrupted fetch can never leave a truncated
 * archive that CMake would then try to link.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { pipeline } = require('stream/promises');
const { Readable } = require('stream');

function human(bytes) {
  return bytes >= 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${(bytes / 1e3).toFixed(0)} kB`;
}

async function sha256(file) {
  const hash = crypto.createHash('sha256');
  await pipeline(fs.createReadStream(file), hash);
  return hash.digest('hex');
}

/** True if the file is already there and intact — makes fetching idempotent. */
async function isSatisfied(artifact) {
  try {
    if (fs.statSync(artifact.dest).size !== artifact.bytes) return false;
    return (await sha256(artifact.dest)) === artifact.sha256;
  } catch {
    return false;
  }
}

async function download(artifact) {
  const res = await fetch(artifact.url, { redirect: 'follow' });
  if (!res.ok || !res.body) {
    throw new Error(`HTTP ${res.status} for ${artifact.url}`);
  }
  fs.mkdirSync(path.dirname(artifact.dest), { recursive: true });
  const part = `${artifact.dest}.part`;
  try {
    await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(part));
    const got = await sha256(part);
    if (got !== artifact.sha256) {
      throw new Error(
        `checksum mismatch for ${artifact.name}\n  expected ${artifact.sha256}\n  got      ${got}\n` +
          'Upstream may have re-published; open an issue rather than trusting this binary.'
      );
    }
    fs.renameSync(part, artifact.dest);
  } catch (e) {
    fs.rmSync(part, { force: true });
    throw e;
  }
}

/** Fetch a list of artifacts, skipping any already present and verified. */
async function fetchAll(artifacts, { log = console.log } = {}) {
  for (const artifact of artifacts) {
    if (await isSatisfied(artifact)) {
      log(`  ✓ ${artifact.name} (already present)`);
      continue;
    }
    log(`  ↓ ${artifact.name} — ${human(artifact.bytes)}`);
    await download(artifact);
    log(`  ✓ ${artifact.name}`);
  }
}

module.exports = { fetchAll, isSatisfied, sha256, human };
