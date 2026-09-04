'use strict';
/**
 * The upstream Needle 2 artifacts, and where they have to land for the Gradle
 * build to find them.
 *
 * These are Cactus's prebuilt binaries (Apache-2.0). They are downloaded rather
 * than vendored into the npm tarball: the engine archive alone is 20 MB and the
 * weights are another 14 MB, and shipping weights inside a package is the wrong
 * default for a model you may well want to replace with your own.
 *
 * `sha256` is pinned deliberately. Hugging Face serves `main`, which is a moving
 * branch — without a checksum an upstream re-upload would silently change the
 * engine underneath a build that had already been tested against it.
 */
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BASE = 'https://huggingface.co/Cactus-Compute/needle2/resolve/main';

/** The engine. Required to compile — CMake links against it. */
const ENGINE = [
  {
    name: 'libneedle.a (arm64-v8a)',
    url: `${BASE}/android-arm64/libneedle.a`,
    dest: path.join(ROOT, 'android/libs/arm64-v8a/libneedle.a'),
    bytes: 20729982,
    sha256: '93738ae3a9488cbc3104eb65bf49093683c26eb01b0d257e980e499d1d06a9f4',
  },
  {
    name: 'needle.h',
    url: `${BASE}/android-arm64/needle.h`,
    dest: path.join(ROOT, 'android/src/main/cpp/needle.h'),
    bytes: 562,
    sha256: 'cb7a720eba7bc895b5bbfa5d6f6fc635906938fdc569eb2520a2c09ba06d9eed',
  },
];

/**
 * The weights. Optional at build time, required before the first `load()`.
 *
 * Dropped into the library's own assets so Gradle merges it into the APK and
 * `loadBundledModel()` finds it with no app-side configuration.
 */
const MODEL = {
  name: 'needle2.cact',
  url: `${BASE}/needle2.cact`,
  dest: path.join(ROOT, 'android/src/main/assets/needle2.cact'),
  bytes: 13737807,
  sha256: 'b43aabfcaf1a6db6acf488076eab71d823c08697c7af4521fc1d174b60ede5ba',
};

// armeabi-v7a is deliberately absent. Cactus's 32-bit archive is built against a
// newer libc++ than NDK 27 ships and fails to link with an undefined
// `std::__ndk1::__hash_memory`, so this package is arm64-only. See README.

module.exports = { ROOT, ENGINE, MODEL };
