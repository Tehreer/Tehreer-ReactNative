require "json"

package = JSON.parse(File.read(File.join(__dir__, "package.json")))

# The podspec sits at the package root, not in ios/: the CLI autolinking only looks for *.podspec
# there, and CocoaPods refuses source_files outside the pod root, while the pod needs cpp/ and
# Libraries/ next to ios/.
dependencies = File.join(__dir__, "Libraries", "Dependencies")
unless File.directory?(File.join(dependencies, "freetype"))
  raise "Core's dependencies are missing. Run `npm run setup` (scripts/fetch-deps) before `pod install`."
end

Pod::Spec.new do |s|
  s.name         = "tehreer-react-native"
  s.version      = package["version"]
  s.summary      = package["description"]
  s.homepage     = "https://github.com/Tehreer/Tehreer-ReactNative"
  s.license      = package["license"]
  s.authors      = "Muhammad Tayyab Akram"
  s.platforms    = { :ios => min_ios_version_supported }
  s.source       = { :git => "https://github.com/Tehreer/Tehreer-ReactNative.git", :tag => "v#{s.version}" }

  # Core and its dependencies are compiled from source into this pod, as tehreerCocoa does with
  # Swift Package Manager. CocoaPods picks the language of a file by its extension, so the C files
  # stay C and harfbuzz.cc stays C++, which is what the skill asks for. The language setting of
  # the C files is given per subspec, because Core is C89 and FreeType needs C99.
  s.subspec "Core" do |ss|
    ss.source_files = [
      "Libraries/TehreerCore/Source/Tehreer.c",
      "Libraries/TehreerCore/Source/**/*.h",
      "Libraries/TehreerCore/Headers/**/*.h",
    ]
    # Headers of the third-party sources stay out of the framework's Headers folder: with
    # use_frameworks! CocoaPods copies every public header there, and Core and SheenBidi both
    # have headers of the same names, which fails the build with "Multiple commands produce".
    ss.project_header_files = ["Libraries/TehreerCore/Source/**/*.h", "Libraries/TehreerCore/Headers/**/*.h"]
    # Core and SheenBidi both have a Source/Core folder with headers of the same names, so each
    # gets its own Source folder through a flag instead of the shared HEADER_SEARCH_PATHS.
    ss.compiler_flags = ["-std=c89", '-I"$(PODS_TARGET_SRCROOT)/Libraries/TehreerCore/Source"']
  end

  s.subspec "Dependencies" do |ss|
    freetype = %w[
      autofit/autofit base/ftbase base/ftbbox base/ftbitmap base/ftdebug base/ftgasp base/ftglyph
      base/ftinit base/ftmm base/ftpatent base/ftstroke base/ftsynth base/ftsystem bdf/bdf cff/cff
      cid/type1cid gzip/ftgzip lzw/ftlzw pcf/pcf pfr/pfr psaux/psaux pshinter/pshinter
      psnames/psnames raster/raster sdf/sdf sfnt/sfnt smooth/smooth svg/svg truetype/truetype
      type1/type1 type42/type42 winfonts/winfnt
    ].map { |name| "Libraries/Dependencies/freetype/src/#{name}.c" }

    unibreak = %w[
      eastasianwidthdef emojidef graphemebreak linebreak linebreakdata linebreakdef unibreakbase
      unibreakdef wordbreak
    ].map { |name| "Libraries/Dependencies/libunibreak/src/#{name}.c" }

    ss.source_files = freetype + unibreak + [
      "Libraries/Dependencies/freetype/include/**/*.h",
      "Libraries/Dependencies/freetype/src/**/*.h",
      "Libraries/Dependencies/libunibreak/src/*.h",
      "Libraries/Dependencies/SheenBidi/Source/SheenBidi.c",
      "Libraries/Dependencies/SheenBidi/Source/**/*.h",
      "Libraries/Dependencies/SheenBidi/Headers/**/*.h",
    ]
    ss.project_header_files = [
      "Libraries/Dependencies/freetype/include/**/*.h",
      "Libraries/Dependencies/freetype/src/**/*.h",
      "Libraries/Dependencies/libunibreak/src/*.h",
      "Libraries/Dependencies/SheenBidi/Source/**/*.h",
      "Libraries/Dependencies/SheenBidi/Headers/**/*.h",
    ]
    ss.compiler_flags = ["-std=gnu99", '-I"$(PODS_TARGET_SRCROOT)/Libraries/Dependencies/SheenBidi/Source"']
  end

  # HarfBuzz is C++, and clang rejects a C language flag for C++ files, so it has no flag.
  s.subspec "HarfBuzz" do |ss|
    ss.source_files = [
      "Libraries/Dependencies/harfbuzz/src/harfbuzz.cc",
      "Libraries/Dependencies/harfbuzz/src/**/*.{h,hh}",
    ]
    ss.project_header_files = ["Libraries/Dependencies/harfbuzz/src/**/*.{h,hh}"]
  end

  s.subspec "Module" do |ss|
    ss.source_files = ["cpp/**/*.{h,cpp}", "ios/**/*.{h,mm}"]
    ss.public_header_files = ["ios/*.h"]
  end

  root = "$(PODS_TARGET_SRCROOT)"
  s.pod_target_xcconfig = {
    "HEADER_SEARCH_PATHS" => [
      "#{root}/cpp",
      "#{root}/ios",
      "#{root}/Libraries/TehreerCore/Headers",
      "#{root}/Libraries/Dependencies/freetype/include",
      "#{root}/Libraries/Dependencies/harfbuzz/src",
      "#{root}/Libraries/Dependencies/libunibreak/src",
      "#{root}/Libraries/Dependencies/SheenBidi/Headers",
    ].join(" "),
    "GCC_PREPROCESSOR_DEFINITIONS" => [
      "$(inherited)",
      "TR_CONFIG_UNITY=1",
      "FT2_BUILD_LIBRARY=1",
      "HAVE_FREETYPE=1",
      "HAVE_FT_GET_VAR_BLEND_COORDINATES=1",
      "HAVE_FT_DONE_MM_VAR=1",
      "SB_CONFIG_UNITY=1",
      "SB_CONFIG_EXPERIMENTAL_TEXT_API=1",
    ].join(" "),
    "CLANG_CXX_LANGUAGE_STANDARD" => "c++20",
    # Core ships Headers/Tehreer/module.modulemap, which clang finds through the header search path
    # and then imports SheenBidi's headers a second time through the module, which makes every
    # SheenBidi name ambiguous. The pod has no Swift or @import users, so modules are not needed.
    "CLANG_ENABLE_MODULES" => "NO",
    # CocoaPods Release builds default to -Os, which makes Core's shaping about 1.5 to 2 times slower
    # than the -O2 that Swift Package Manager uses for tehreerCocoa (see benchmarks/RESULTS.md).
    "GCC_OPTIMIZATION_LEVEL[config=Release]" => "2",
  }

  install_modules_dependencies(s)
end
