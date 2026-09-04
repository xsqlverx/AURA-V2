#include <jni.h>
#include <android/log.h>
#include <string>
#include <vector>
#include "needle.h"

#define LOG(...) __android_log_print(ANDROID_LOG_INFO, "NeedleJNI", __VA_ARGS__)

namespace {
/** Needle writes into a caller-supplied buffer; this is our ceiling per call. */
constexpr int kOutCapacity = 1 << 16; // 64 KB

std::string jstr(JNIEnv* env, jstring s) {
  if (!s) return {};
  const char* c = env->GetStringUTFChars(s, nullptr);
  std::string out(c ? c : "");
  if (c) env->ReleaseStringUTFChars(s, c);
  return out;
}
} // namespace

extern "C" {

JNIEXPORT jint JNICALL
Java_expo_modules_needle_NeedleNative_nativeLoad(JNIEnv* env, jclass, jbyteArray model) {
  const jsize n = env->GetArrayLength(model);
  std::vector<unsigned char> buf(static_cast<size_t>(n));
  env->GetByteArrayRegion(model, 0, n, reinterpret_cast<jbyte*>(buf.data()));
  const int rc = needle_load(buf.data(), static_cast<unsigned long long>(n));
  LOG("needle_load(%d bytes) -> %d", n, rc);
  return rc;
}

JNIEXPORT jint JNICALL
Java_expo_modules_needle_NeedleNative_nativeInit(
    JNIEnv* env, jclass, jstring systemPrompt, jstring toolsJson, jstring toolIndexPath) {
  const std::string sp = jstr(env, systemPrompt);
  const std::string tj = jstr(env, toolsJson);
  const std::string ti = jstr(env, toolIndexPath);
  const int rc = needle_init(
      sp.empty() ? nullptr : sp.c_str(),
      tj.empty() ? nullptr : tj.c_str(),
      ti.empty() ? nullptr : ti.c_str());
  LOG("needle_init -> %d", rc);
  return rc;
}

JNIEXPORT jstring JNICALL
Java_expo_modules_needle_NeedleNative_nativeComplete(
    JNIEnv* env, jclass, jstring input, jint maxNewTokens) {
  const std::string in = jstr(env, input);
  std::vector<char> out(kOutCapacity, 0);
  const int rc = needle_complete(in.c_str(), maxNewTokens, out.data(), kOutCapacity);
  if (rc < 0) {
    LOG("needle_complete -> %d (error)", rc);
    return nullptr;
  }
  out[kOutCapacity - 1] = '\0';
  return env->NewStringUTF(out.data());
}

JNIEXPORT void JNICALL
Java_expo_modules_needle_NeedleNative_nativeReset(JNIEnv*, jclass) {
  needle_reset();
}

} // extern "C"
