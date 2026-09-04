cmake_minimum_required(VERSION 3.22)
project(needlejni)

set(NEEDLE_LIB ${CMAKE_CURRENT_SOURCE_DIR}/../../../libs/${ANDROID_ABI}/libneedle.a)

# The engine is downloaded on install, not vendored. If that did not happen —
# offline, `--ignore-scripts`, pnpm's default postinstall blocking — fail here
# with the fix rather than a wall of undefined symbols at link time.
if(NOT EXISTS ${NEEDLE_LIB})
  message(FATAL_ERROR
    "react-native-needle: missing ${NEEDLE_LIB}\n"
    "Run:  npx react-native-needle fetch\n"
    "(If this is an unsupported ABI, note the engine is arm64-v8a only.)")
endif()

# Needle ships a per-ABI static archive containing just needle.cpp.o and
# needle_embed.S.o. Everything it references is libc/libc++, so linking is
# simply the archive plus the STL — no third-party runtime to bundle.
add_library(needle STATIC IMPORTED)
set_target_properties(needle PROPERTIES IMPORTED_LOCATION ${NEEDLE_LIB})

add_library(needlejni SHARED needle_jni.cpp)
target_include_directories(needlejni PRIVATE ${CMAKE_CURRENT_SOURCE_DIR})
find_library(log-lib log)
target_link_libraries(needlejni needle ${log-lib})
